import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSiteContent } from "@/hooks/useSiteContent";
import { EditableText } from "./admin/EditableText";
import { EditableButton } from "./admin/EditableButton";
import { useProductAccess } from "@/hooks/useProductAccess";
import { useAuth } from "@/hooks/useAuth";

interface Plan {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  popular?: boolean;
}

const PricingSection = () => {
  const { t, i18n } = useTranslation();
  const { ds, overrides } = useSiteContent("pricing");
  const rawPlans = t("pricing.plans", { returnObjects: true });
  const plans = Array.isArray(rawPlans) ? (rawPlans as Plan[]) : [];
  const { user } = useAuth();
  const { isPro } = useProductAccess("profit-planner");

  const getPlanLabel = (plan: Plan, i: number) => {
    if (plan.popular && isPro) return i18n.language?.startsWith("th") ? "เข้าใช้งาน" : "Go to App";
    return ds(`plan_${i}_cta`, `pricing.plans.${i}.cta`);
  };

  const getPlanHref = (plan: Plan, i: number) => {
    if (plan.popular) {
      return isPro ? "/app/profit-planner" : (overrides[`plan_${i}_cta_href`] || "/checkout/profit-planner");
    }
    // Free plan: go straight into the app (paywall handles feature gating inside)
    const stored = overrides[`plan_${i}_cta_href`];
    if (stored) return stored;
    return user ? "/app/profit-planner/dashboard" : "/login";
  };

  return (
    <section id="pricing" className="section-padding">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-sm font-semibold text-primary uppercase tracking-widest mb-3">
            <EditableText section="pricing" fieldKey="label" defaultValue={ds("label", "pricing.label")} />
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            <EditableText section="pricing" fieldKey="title" defaultValue={ds("title", "pricing.title")} />
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            <EditableText section="pricing" fieldKey="description" defaultValue={ds("description", "pricing.description")} multiline />
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 items-start">
          {plans.length > 0 ? plans.map((plan, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`glass-card p-8 flex flex-col relative ${
                plan.popular ? "ring-2 ring-primary md:-mt-4 md:mb-0" : ""
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-4 py-1 rounded-full">
                  Most Popular
                </div>
              )}

              <h3 className="font-display font-bold text-xl text-foreground mb-1">
                 <EditableText section="pricing" fieldKey={`plan_${i}_name`} defaultValue={ds(`plan_${i}_name`, `pricing.plans.${i}.name`)} />
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                 <EditableText section="pricing" fieldKey={`plan_${i}_desc`} defaultValue={ds(`plan_${i}_desc`, `pricing.plans.${i}.description`)} multiline />
              </p>

              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-4xl font-bold text-foreground">
                   <EditableText section="pricing" fieldKey={`plan_${i}_price`} defaultValue={ds(`plan_${i}_price`, `pricing.plans.${i}.price`)} />
                </span>
                <span className="text-muted-foreground text-sm">
                   <EditableText section="pricing" fieldKey={`plan_${i}_period`} defaultValue={ds(`plan_${i}_period`, `pricing.plans.${i}.period`)} />
                </span>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {Array.isArray(plan.features) && plan.features.map((feature, fi) => (
                  <li key={fi} className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Check size={16} className="text-primary flex-shrink-0" />
                    <EditableText section="pricing" fieldKey={`plan_${i}_feat_${fi}`} defaultValue={ds(`plan_${i}_feat_${fi}`, `pricing.plans.${i}.features.${fi}`)} />
                  </li>
                ))}
              </ul>

              <EditableButton
                section="pricing"
                fieldKey={`plan_${i}_cta`}
                defaultLabel={getPlanLabel(plan, i)}
                defaultHref={getPlanHref(plan, i)}
                className={`w-full py-3 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center justify-center ${
                  plan.popular
                    ? "btn-primary shadow-lg shadow-primary/20"
                    : "border-2 border-border text-foreground hover:border-primary hover:text-primary"
                }`}
              />
            </motion.div>
          )) : (
            <div className="col-span-3 py-10 text-center text-muted-foreground italic">No pricing plans found.</div>
          )}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
