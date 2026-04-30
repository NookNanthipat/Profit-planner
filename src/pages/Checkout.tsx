import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Check, Loader2, Sparkles, CreditCard, ShieldCheck } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { supabase, type Product } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? "");

const formatPrice = (cents: number, currency: string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);

// ── Inner payment form (must be a child of <Elements>) ────────────────────────

interface PaymentFormProps {
  product: Product;
  onCancel: () => void;
}

function StripePaymentForm({ product, onCancel }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [processing, setProcessing] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || !user) return;

    setProcessing(true);
    setFieldError(null);

    // Validate form fields first
    const { error: submitError } = await elements.submit();
    if (submitError) {
      setFieldError(submitError.message ?? "Please check your card details.");
      setProcessing(false);
      return;
    }

    // Confirm payment (redirect: if_required → cards won't redirect)
    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (confirmError) {
      setFieldError(confirmError.message ?? "Payment failed. Please try again.");
      setProcessing(false);
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      // Grant access via Edge Function
      const { data, error: grantError } = await supabase.functions.invoke(
        "grant-product-access",
        {
          body: {
            productId: product.id,
            mode: "stripe",
            stripePaymentIntentId: paymentIntent.id,
          },
        },
      );

      if (grantError || data?.error) {
        toast({
          title: "Access Error",
          description:
            data?.error ??
            "Payment succeeded but access grant failed. Please contact support.",
          variant: "destructive",
        });
        setProcessing(false);
        return;
      }

      toast({
        title: "Payment successful!",
        description: "Welcome aboard! Redirecting you now...",
      });
      navigate(data?.redirectUrl ?? product.app_route ?? "/portal");
    } else {
      setFieldError("Payment was not completed. Please try again.");
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement
        options={{
          layout: "tabs",
        }}
      />

      {fieldError && (
        <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
          {fieldError}
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button
          type="submit"
          size="lg"
          className="flex-1"
          disabled={!stripe || processing}
        >
          {processing ? (
            <Loader2 className="animate-spin" />
          ) : (
            <>
              <CreditCard size={16} />
              Pay {formatPrice(product.price_amount ?? 0, product.currency)}
            </>
          )}
        </Button>
        <Button
          type="button"
          size="lg"
          variant="ghost"
          disabled={processing}
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>

      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-1">
        <ShieldCheck size={13} />
        <span>Secured by Stripe · SSL encrypted</span>
      </div>
    </form>
  );
}

// ── Main Checkout page ────────────────────────────────────────────────────────

const Checkout = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadingIntent, setLoadingIntent] = useState(false);
  const [trialLoading, setTrialLoading] = useState(false);

  useEffect(() => {
    if (!slug) return;
    supabase
      .from("products")
      .select("*")
      .eq("slug", slug)
      .maybeSingle()
      .then(({ data }) => {
        setProduct(data as Product | null);
        setLoading(false);
      });
  }, [slug]);

  const startStripeCheckout = async () => {
    if (!user || !product) return;
    setLoadingIntent(true);

    const { data, error } = await supabase.functions.invoke(
      "create-payment-intent",
      { body: { productId: product.id } },
    );

    if (error || data?.error) {
      toast({
        title: "Error",
        description: data?.error ?? "Could not initialize checkout. Please try again.",
        variant: "destructive",
      });
      setLoadingIntent(false);
      return;
    }

    setClientSecret(data.clientSecret);
    setLoadingIntent(false);
  };

  const startTrial = async () => {
    if (!user || !product) return;
    setTrialLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("grant-product-access", {
        body: { productId: product.id, mode: "trial" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({
        title: "Trial started",
        description: data?.message ?? "Your 7-day trial is now active.",
      });
      navigate(data?.redirectUrl ?? product.app_route ?? "/portal");
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setTrialLoading(false);
    }
  };

  // ── Loading / error states ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p>Product not found</p>
        <Button asChild>
          <Link to="/portal">Back to portal</Link>
        </Button>
      </div>
    );
  }

  const stripeElementsOptions = {
    clientSecret: clientSecret ?? undefined,
    appearance: {
      theme: "night" as const,
      variables: {
        colorPrimary: "#6366f1",
        borderRadius: "8px",
        fontFamily: "Inter, sans-serif",
      },
    },
  };

  return (
    <div className="min-h-screen bg-background py-12 px-6">
      <div className="max-w-3xl mx-auto">
        <Link
          to="/portal"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft size={16} /> Back to portal
        </Link>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-8 backdrop-blur bg-card/80 border-border/60 shadow-xl">
            {/* Product info */}
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <Badge variant="secondary" className="mb-2">
                  {product.badge || "Premium"}
                </Badge>
                <h1 className="text-3xl font-display font-bold">{product.name}</h1>
                <p className="text-muted-foreground mt-2">{product.description}</p>
              </div>
              <div className="text-right shrink-0">
                <div className="text-3xl font-bold">
                  {formatPrice(product.price_amount ?? 0, product.currency)}
                </div>
                <div className="text-xs text-muted-foreground">one-time</div>
              </div>
            </div>

            {/* Feature list */}
            <div className="space-y-2 mb-8">
              {["Lifetime access", "Free updates", "Email support", "30-day money-back"].map(
                (f) => (
                  <div key={f} className="flex items-center gap-2 text-sm">
                    <Check size={16} className="text-primary" /> {f}
                  </div>
                ),
              )}
            </div>

            <div className="border-t border-border/40 pt-6">
              <AnimatePresence mode="wait">
                {clientSecret ? (
                  /* ── Stripe Elements form ── */
                  <motion.div
                    key="stripe-form"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                  >
                    <p className="text-sm font-medium mb-4">Enter payment details</p>
                    <Elements stripe={stripePromise} options={stripeElementsOptions}>
                      <StripePaymentForm
                        product={product}
                        onCancel={() => setClientSecret(null)}
                      />
                    </Elements>
                  </motion.div>
                ) : (
                  /* ── CTA buttons ── */
                  <motion.div
                    key="cta-buttons"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="flex flex-col sm:flex-row gap-3"
                  >
                    <Button
                      size="lg"
                      className="flex-1"
                      disabled={loadingIntent}
                      onClick={startStripeCheckout}
                    >
                      {loadingIntent ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <>
                          <CreditCard size={16} />
                          Buy Now
                        </>
                      )}
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      className="flex-1"
                      disabled={trialLoading}
                      onClick={startTrial}
                    >
                      {trialLoading ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <>
                          <Sparkles size={16} /> Start 7-day Trial
                        </>
                      )}
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Checkout;
