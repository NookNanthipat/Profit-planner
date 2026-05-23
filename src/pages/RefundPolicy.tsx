import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { RotateCcw } from "lucide-react";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-3">
    <h2 className="text-xl font-bold text-foreground">{title}</h2>
    <div className="text-muted-foreground leading-relaxed space-y-2">{children}</div>
  </div>
);

const RefundPolicy = () => {
  const { i18n } = useTranslation();
  const isTh = i18n.language === "th";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 py-24">
        <div className="flex items-center gap-4 mb-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <RotateCcw size={24} />
          </div>
          <h1 className="text-4xl font-black uppercase tracking-tighter">
            {isTh ? "นโยบายการคืนเงิน" : "Refund Policy"}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground mb-12">
          {isTh ? "อัปเดตล่าสุด: 1 พฤษภาคม 2569" : "Last updated: May 1, 2026"}
        </p>

        <div className="space-y-10">

          <Section title={isTh ? "1. นโยบาย 30 วันคืนเงิน" : "1. 30-Day Money-Back Guarantee"}>
            {isTh ? (
              <>
                <p>
                  หากคุณไม่พึงพอใจกับบริการ ProfitPlanner ด้วยเหตุผลใดก็ตาม คุณสามารถขอคืนเงินเต็มจำนวนได้ภายใน
                  <strong> 30 วันนับจากวันที่ชำระเงิน</strong>
                </p>
                <p>เงื่อนไข:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>ส่งคำขอภายใน 30 วันนับจากวันที่ชำระเงินครั้งแรก</li>
                  <li>ใช้กับการสมัครครั้งแรกเท่านั้น ไม่รวมการต่ออายุ</li>
                  <li>คำขอต้องมาจากอีเมลที่ลงทะเบียนในระบบ</li>
                </ul>
              </>
            ) : (
              <>
                <p>
                  If you are not satisfied with ProfitPlanner for any reason, you may request a full refund within
                  <strong> 30 days of your original purchase date.</strong>
                </p>
                <p>Conditions:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Request must be submitted within 30 days of initial payment</li>
                  <li>Applies to first-time subscriptions only, not renewals</li>
                  <li>Request must originate from your registered account email</li>
                </ul>
              </>
            )}
          </Section>

          <Section title={isTh ? "2. กรณีที่ไม่อยู่ในเงื่อนไขคืนเงิน" : "2. Non-Refundable Cases"}>
            {isTh ? (
              <ul className="list-disc pl-5 space-y-1">
                <li>คำขอหลังจาก 30 วัน</li>
                <li>การต่ออายุรายปีหรือรายเดือน (เว้นแต่มีข้อผิดพลาดทางเทคนิคจากเรา)</li>
                <li>การซื้อ Trial ที่ระบุชัดว่าไม่คืนเงิน</li>
              </ul>
            ) : (
              <ul className="list-disc pl-5 space-y-1">
                <li>Requests made after 30 days</li>
                <li>Annual or monthly renewals (unless due to a billing error on our part)</li>
                <li>Trial purchases explicitly marked as non-refundable</li>
              </ul>
            )}
          </Section>

          <Section title={isTh ? "3. วิธีขอคืนเงิน" : "3. How to Request a Refund"}>
            {isTh ? (
              <>
                <p>ส่งอีเมลไปที่ <strong>nanthipat.nia@gmail.com</strong> พร้อมข้อมูลดังนี้:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>อีเมลที่ใช้ลงทะเบียน</li>
                  <li>วันที่ชำระเงิน</li>
                  <li>เหตุผลในการขอคืนเงิน (ไม่บังคับ แต่ช่วยให้เราพัฒนาบริการได้)</li>
                </ul>
                <p>เราจะดำเนินการภายใน <strong>5 วันทำการ</strong> และเงินจะคืนสู่บัตร/บัญชีเดิมภายใน 5–10 วันทำการ</p>
              </>
            ) : (
              <>
                <p>Email <strong>nanthipat.nia@gmail.com</strong> with the following:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Your registered email address</li>
                  <li>Date of payment</li>
                  <li>Reason for refund (optional, but helps us improve)</li>
                </ul>
                <p>We will process your request within <strong>5 business days</strong>. Funds will be returned to your original payment method within 5–10 business days.</p>
              </>
            )}
          </Section>

          <Section title={isTh ? "4. การยกเลิกสมาชิก" : "4. Cancellation"}>
            {isTh ? (
              <div className="space-y-4">
                <div>
                  <p className="font-semibold text-foreground mb-1">ยกเลิกการสมัครสมาชิก (Subscription)</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>ยกเลิกได้ตลอดเวลาโดยติดต่อ <strong>nanthipat.nia@gmail.com</strong></li>
                    <li>หลังยกเลิก คุณยังคงใช้งานได้จนถึงวันสิ้นสุดรอบบิลปัจจุบัน</li>
                    <li>จะไม่มีการเรียกเก็บเงินในรอบถัดไป</li>
                    <li>ข้อมูลและบัญชีของคุณ<strong>ยังคงอยู่</strong> — สามารถสมัครใหม่ได้ทุกเมื่อ</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-foreground mb-1">ลบบัญชีผู้ใช้ (Account Deletion)</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>ลบบัญชีได้ที่ Portal → Danger Zone → Delete Account</li>
                    <li>การลบบัญชีจะยกเลิก subscription และลบข้อมูลทั้งหมดอย่างถาวร</li>
                    <li><strong>ไม่สามารถย้อนคืนได้</strong> — หากต้องการแค่หยุดจ่ายเงิน ให้ยกเลิก subscription แทน</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="font-semibold text-foreground mb-1">Cancel Subscription</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Cancel at any time by contacting <strong>nanthipat.nia@gmail.com</strong></li>
                    <li>After cancellation, you retain full access until the end of the current billing period</li>
                    <li>No further charges will be made</li>
                    <li>Your account and data <strong>remain intact</strong> — you can resubscribe at any time</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-foreground mb-1">Delete Account</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Delete your account via Portal → Danger Zone → Delete Account</li>
                    <li>Account deletion cancels your subscription and permanently removes all data</li>
                    <li><strong>This cannot be undone</strong> — if you only want to stop billing, cancel your subscription instead</li>
                  </ul>
                </div>
              </div>
            )}
          </Section>

          <div className="pt-10 border-t border-border space-y-2 text-sm text-muted-foreground">
            <p>
              {isTh ? "ติดต่อ:" : "Contact:"}{" "}
              <strong>nanthipat.nia@gmail.com</strong>
            </p>
            <p>
              {isTh ? "ดูเพิ่มเติม:" : "See also:"}{" "}
              <Link to="/tos" className="text-primary hover:underline">
                {isTh ? "ข้อตกลงการใช้งาน" : "Terms of Service"}
              </Link>
              {" · "}
              <Link to="/privacy" className="text-primary hover:underline">
                {isTh ? "นโยบายความเป็นส่วนตัว" : "Privacy Policy"}
              </Link>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default RefundPolicy;
