import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Scale, AlertTriangle, Shield, Lock, Gavel, FileText, Ban, Phone } from "lucide-react";

const Section = ({
  icon,
  title,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-3">
    <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
      {icon}
      {title}
    </h2>
    <div className="text-muted-foreground leading-relaxed space-y-2">{children}</div>
  </div>
);

const TermsOfService = () => {
  const { i18n } = useTranslation();
  const isTh = i18n.language === "th";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 py-24">
        <div className="flex items-center gap-4 mb-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <Scale size={24} />
          </div>
          <h1 className="text-4xl font-black uppercase tracking-tighter">
            {isTh ? "ข้อตกลงการใช้งาน" : "Terms of Service"}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground mb-10">
          {isTh ? "อัปเดตล่าสุด: 1 พฤษภาคม 2569" : "Last updated: May 1, 2026"} · Version 1.0
        </p>

        {/* Financial Disclaimer — most important box */}
        <div className="p-6 bg-rose-500/5 border border-rose-500/30 rounded-[32px] mb-10 space-y-3">
          <h2 className="text-rose-500 font-black text-lg flex items-center gap-2">
            <AlertTriangle size={20} />
            {isTh ? "ข้อความสำคัญ: ไม่ใช่คำแนะนำทางการเงิน" : "Important: Not Financial Advice"}
          </h2>
          {isTh ? (
            <ul className="list-disc pl-5 space-y-1.5 text-sm text-muted-foreground">
              <li><strong className="text-foreground">ProfitPlanner ไม่ใช่ที่ปรึกษาทางการเงิน</strong> นักวิเคราะห์หลักทรัพย์ หรือผู้ได้รับใบอนุญาตจากสำนักงานคณะกรรมการกำกับหลักทรัพย์และตลาดหลักทรัพย์ (ก.ล.ต.)</li>
              <li>ข้อมูล ตัวเลข และผลการจำลองในแอปมีไว้เพื่อการศึกษาและติดตามเท่านั้น — ไม่ใช่คำแนะนำให้ซื้อ ขาย หรือถือครองสินทรัพย์ใดๆ</li>
              <li>ราคาตลาดที่แสดงอาจมีความล่าช้า ไม่ถูกต้อง หรือไม่สมบูรณ์</li>
              <li><strong className="text-foreground">คุณรับผิดชอบการตัดสินใจทางการเงินของคุณเองทั้งหมด</strong></li>
            </ul>
          ) : (
            <ul className="list-disc pl-5 space-y-1.5 text-sm text-muted-foreground">
              <li><strong className="text-foreground">ProfitPlanner is NOT a financial advisor</strong>, securities analyst, or entity licensed by the Securities and Exchange Commission (SEC) of Thailand.</li>
              <li>All data, figures, and simulation results are for educational and tracking purposes only — they do not constitute advice to buy, sell, or hold any asset.</li>
              <li>Market prices displayed may be delayed, inaccurate, or incomplete.</li>
              <li><strong className="text-foreground">You are solely responsible for all your financial decisions.</strong></li>
            </ul>
          )}
        </div>

        <div className="space-y-10">

          {/* 1. Acceptance */}
          <Section icon={<FileText size={18} className="text-primary" />} title={isTh ? "1. การยอมรับข้อตกลง" : "1. Acceptance of Terms"}>
            {isTh ? (
              <p>
                การสมัครสมาชิก เข้าสู่ระบบ หรือใช้งาน ProfitPlanner ไม่ว่าในรูปแบบใดถือว่าคุณได้อ่านและยอมรับข้อตกลงนี้ทั้งหมด
                หากคุณไม่ยอมรับ กรุณางดใช้บริการ
              </p>
            ) : (
              <p>
                By registering, logging in, or using ProfitPlanner in any form, you confirm that you have read and agree to these Terms in full.
                If you do not agree, please discontinue use of the service.
              </p>
            )}
          </Section>

          {/* 2. Eligibility */}
          <Section icon={<Shield size={18} className="text-primary" />} title={isTh ? "2. คุณสมบัติผู้ใช้" : "2. Eligibility"}>
            {isTh ? (
              <ul className="list-disc pl-5 space-y-1">
                <li>ต้องมีอายุ 18 ปีบริบูรณ์ขึ้นไป</li>
                <li>ต้องมีความสามารถตามกฎหมายในการทำนิติกรรม</li>
                <li>ไม่ถูกระงับหรือห้ามใช้บริการโดย ProfitPlanner มาก่อน</li>
              </ul>
            ) : (
              <ul className="list-disc pl-5 space-y-1">
                <li>You must be at least 18 years old</li>
                <li>You must have legal capacity to enter into a binding agreement</li>
                <li>You must not have been previously suspended or banned from using ProfitPlanner</li>
              </ul>
            )}
          </Section>

          {/* 3. Service Description */}
          <Section icon={<FileText size={18} className="text-primary" />} title={isTh ? "3. คำอธิบายบริการ" : "3. Service Description"}>
            {isTh ? (
              <>
                <p>ProfitPlanner ให้บริการเครื่องมือสำหรับ:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>บันทึกและติดตามรายรับ รายจ่าย และงบประมาณส่วนตัว</li>
                  <li>ติดตามพอร์ตสินทรัพย์และหนี้สิน</li>
                  <li>จำลองสถานการณ์ทางการเงินเพื่อการวางแผน</li>
                  <li>แสดงราคาตลาดจากแหล่งข้อมูลบุคคลที่สาม</li>
                </ul>
                <p className="text-sm">
                  เราขอสงวนสิทธิ์ในการเพิ่ม ลด หรือเปลี่ยนแปลงฟีเจอร์ได้ตลอดเวลาโดยไม่ต้องแจ้งล่วงหน้า
                </p>
              </>
            ) : (
              <>
                <p>ProfitPlanner provides tools for:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Recording and tracking personal income, expenses, and budgets</li>
                  <li>Tracking asset portfolios and liabilities</li>
                  <li>Simulating financial scenarios for planning purposes</li>
                  <li>Displaying market prices from third-party data sources</li>
                </ul>
                <p className="text-sm">
                  We reserve the right to add, remove, or modify features at any time without prior notice.
                </p>
              </>
            )}
          </Section>

          {/* 4. User Obligations */}
          <Section icon={<Lock size={18} className="text-primary" />} title={isTh ? "4. หน้าที่ของผู้ใช้" : "4. User Obligations"}>
            {isTh ? (
              <ul className="list-disc pl-5 space-y-1">
                <li>รักษาความลับของรหัสผ่านและข้อมูลบัญชีของตัวเอง</li>
                <li>ไม่ใช้บริการเพื่อวัตถุประสงค์ที่ผิดกฎหมาย ฉ้อโกง หรือละเมิดสิทธิ์ผู้อื่น</li>
                <li>ไม่พยายาม reverse engineer หรือเจาะระบบ</li>
                <li>แจ้งเราทันทีหากพบการใช้งานบัญชีโดยไม่ได้รับอนุญาต</li>
                <li>ไม่แชร์บัญชีกับผู้อื่น (1 บัญชีต่อ 1 คน)</li>
              </ul>
            ) : (
              <ul className="list-disc pl-5 space-y-1">
                <li>Maintain the confidentiality of your password and account credentials</li>
                <li>Not use the service for illegal, fraudulent, or rights-infringing purposes</li>
                <li>Not attempt to reverse-engineer or breach the system</li>
                <li>Notify us immediately upon discovering unauthorized account use</li>
                <li>Not share your account with others (one account per person)</li>
              </ul>
            )}
          </Section>

          {/* 5. Payments & Refunds */}
          <Section icon={<FileText size={18} className="text-primary" />} title={isTh ? "5. การชำระเงินและการคืนเงิน" : "5. Payments & Refunds"}>
            {isTh ? (
              <>
                <p>บางฟีเจอร์ต้องมีการสมัครสมาชิก Pro (มีค่าใช้จ่าย)</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>ราคาแสดงรวม VAT แล้ว (ถ้ามี)</li>
                  <li>ชำระเงินผ่านช่องทางที่ระบุใน Checkout เท่านั้น</li>
<<<<<<< HEAD
=======
                  <li>การชำระเงินประมวลผลอย่างปลอดภัยโดย <strong>Stripe, Inc.</strong> — ProfitPlanner ไม่จัดเก็บหมายเลขบัตรเครดิต</li>
>>>>>>> a2a1ac5 (feat: PDPA compliance, legal pages, Google consent flow, Netlify config)
                  <li>มีนโยบายคืนเงินภายใน 30 วัน — ดูรายละเอียดที่ <Link to="/refund" className="text-primary hover:underline">นโยบายการคืนเงิน</Link></li>
                </ul>
              </>
            ) : (
              <>
                <p>Some features require a paid Pro subscription.</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Prices are displayed inclusive of VAT (where applicable)</li>
                  <li>Payment must be made through channels specified in Checkout only</li>
<<<<<<< HEAD
=======
                  <li>Payments are securely processed by <strong>Stripe, Inc.</strong> — ProfitPlanner does not store card numbers.</li>
>>>>>>> a2a1ac5 (feat: PDPA compliance, legal pages, Google consent flow, Netlify config)
                  <li>30-day money-back guarantee — see <Link to="/refund" className="text-primary hover:underline">Refund Policy</Link> for details</li>
                </ul>
              </>
            )}
          </Section>

          {/* 6. Intellectual Property */}
          <Section icon={<Shield size={18} className="text-primary" />} title={isTh ? "6. ทรัพย์สินทางปัญญา" : "6. Intellectual Property"}>
            {isTh ? (
              <p>
                โค้ด การออกแบบ โลโก้ และเนื้อหาทั้งหมดของ ProfitPlanner เป็นทรัพย์สินของ นันทิพัฒน์ เนียมหลาง
                ห้ามทำซ้ำ ดัดแปลง หรือเผยแพร่โดยไม่ได้รับอนุญาตเป็นลายลักษณ์อักษร
              </p>
            ) : (
              <p>
                All code, design, branding, logos, and content of ProfitPlanner are the intellectual property of Nanthipat Niamlang.
                Reproduction, modification, or redistribution without express written permission is prohibited.
              </p>
            )}
          </Section>

          {/* 7. Limitation of Liability */}
          <Section icon={<Ban size={18} className="text-primary" />} title={isTh ? "7. การจำกัดความรับผิด" : "7. Limitation of Liability"}>
            {isTh ? (
              <>
                <p>ในขอบเขตสูงสุดที่กฎหมายอนุญาต ProfitPlanner และผู้ให้บริการจะไม่รับผิดต่อ:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>ความสูญเสียทางการเงินหรือการลงทุนที่เกิดจากการตัดสินใจของผู้ใช้</li>
                  <li>ความไม่ถูกต้องของราคาตลาดหรือการคำนวณ</li>
                  <li>การหยุดทำงานของบริการ (service interruption)</li>
                  <li>การสูญหายของข้อมูลจากเหตุสุดวิสัย</li>
                </ul>
                <p className="text-sm">ความรับผิดสูงสุดของเราจำกัดอยู่ที่ค่าบริการที่คุณชำระจริงใน 3 เดือนล่าสุด</p>
              </>
            ) : (
              <>
                <p>To the fullest extent permitted by law, ProfitPlanner and its operators shall not be liable for:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Financial losses or investment outcomes resulting from user decisions</li>
                  <li>Inaccuracies in market prices or financial calculations</li>
                  <li>Service interruptions or downtime</li>
                  <li>Data loss caused by events beyond our control</li>
                </ul>
                <p className="text-sm">Our maximum liability is limited to the amount you actually paid in the past 3 months.</p>
              </>
            )}
          </Section>

          {/* 8. Termination */}
          <Section icon={<Ban size={18} className="text-primary" />} title={isTh ? "8. การระงับและยกเลิกบัญชี" : "8. Termination"}>
            {isTh ? (
              <ul className="list-disc pl-5 space-y-1">
                <li>คุณสามารถลบบัญชีได้ตลอดเวลาใน Portal → Danger Zone</li>
                <li>เราขอสงวนสิทธิ์ระงับบัญชีที่ละเมิดข้อตกลงนี้โดยไม่ต้องแจ้งล่วงหน้า</li>
                <li>เมื่อบัญชีถูกลบ ข้อมูลทางการเงินทั้งหมดจะถูกลบถาวรตาม PDPA</li>
              </ul>
            ) : (
              <ul className="list-disc pl-5 space-y-1">
                <li>You may delete your account at any time via Portal → Danger Zone</li>
                <li>We reserve the right to suspend accounts that violate these Terms without prior notice</li>
                <li>Upon account deletion, all financial data is permanently removed per PDPA</li>
              </ul>
            )}
          </Section>

          {/* 9. Governing Law */}
          <Section icon={<Gavel size={18} className="text-primary" />} title={isTh ? "9. กฎหมายที่ใช้บังคับ" : "9. Governing Law"}>
            {isTh ? (
              <p>
                ข้อตกลงนี้อยู่ภายใต้กฎหมายแห่งราชอาณาจักรไทย ข้อพิพาทใดๆ จะอยู่ในเขตอำนาจของศาลไทย
                ซึ่งรวมถึงพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562, พระราชบัญญัติว่าด้วยธุรกรรมทางอิเล็กทรอนิกส์ พ.ศ. 2544
                และกฎหมายที่เกี่ยวข้อง
              </p>
            ) : (
              <p>
                These Terms are governed by the laws of the Kingdom of Thailand. Any disputes shall be subject to the jurisdiction of Thai courts,
                including the Personal Data Protection Act B.E. 2562, the Electronic Transactions Act B.E. 2544, and related legislation.
              </p>
            )}
          </Section>

          {/* 10. Changes to Terms */}
          <Section icon={<FileText size={18} className="text-primary" />} title={isTh ? "10. การเปลี่ยนแปลงข้อตกลง" : "10. Changes to Terms"}>
            {isTh ? (
              <p>
                เราอาจอัปเดตข้อตกลงนี้เป็นครั้งคราว หากมีการเปลี่ยนแปลงสาระสำคัญจะแจ้งทางอีเมลก่อน 30 วัน
                การใช้งานต่อไปหลังวันที่มีผลบังคับถือเป็นการยอมรับข้อตกลงใหม่
              </p>
            ) : (
              <p>
                We may update these Terms from time to time. For material changes, we will notify you by email at least 30 days in advance.
                Continued use after the effective date constitutes acceptance of the updated Terms.
              </p>
            )}
          </Section>

          {/* Contact */}
          <div className="pt-10 border-t border-border space-y-2 text-sm text-muted-foreground">
            <p>
              {isTh ? "ติดต่อ:" : "Contact:"}{" "}
              <strong>support@profitplanner.app</strong>
              {" · "}
              <strong>nanthipat.nia@gmail.com</strong>
            </p>
            <p>
              {isTh ? "ดูเพิ่มเติม:" : "See also:"}{" "}
              <Link to="/privacy" className="text-primary hover:underline">
                {isTh ? "นโยบายความเป็นส่วนตัว" : "Privacy Policy"}
              </Link>
              {" · "}
              <Link to="/refund" className="text-primary hover:underline">
                {isTh ? "นโยบายการคืนเงิน" : "Refund Policy"}
              </Link>
            </p>
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TermsOfService;
