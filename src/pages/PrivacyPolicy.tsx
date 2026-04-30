import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Shield } from "lucide-react";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-3">
    <h2 className="text-xl font-bold text-foreground">{title}</h2>
    <div className="text-muted-foreground leading-relaxed space-y-2">{children}</div>
  </div>
);

const PrivacyPolicy = () => {
  const { i18n } = useTranslation();
  const isTh = i18n.language === "th";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 py-24">
        <div className="flex items-center gap-4 mb-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <Shield size={24} />
          </div>
          <h1 className="text-4xl font-black uppercase tracking-tighter">
            {isTh ? "นโยบายความเป็นส่วนตัว" : "Privacy Policy"}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground mb-12">
          {isTh ? "อัปเดตล่าสุด: 1 พฤษภาคม 2569" : "Last updated: May 1, 2026"} · Version 1.0
        </p>

        <div className="space-y-10">

          {/* 1. Data Controller */}
          <Section title={isTh ? "1. ผู้ควบคุมข้อมูลส่วนบุคคล" : "1. Data Controller"}>
            {isTh ? (
              <>
                <p>
                  <strong>ProfitPlanner</strong> ("บริษัท", "เรา") เป็นผู้ควบคุมข้อมูลส่วนบุคคลตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 ("PDPA")
                </p>
                <p>ผู้ควบคุมข้อมูล: <strong>นันทิพัฒน์ เนียมหลาง</strong></p>
                <p>ที่อยู่: นนทบุรี, ประเทศไทย</p>
                <p>อีเมลติดต่อ: <strong>nanthipat.nia@gmail.com</strong></p>
              </>
            ) : (
              <>
                <p>
                  <strong>ProfitPlanner</strong> ("Company", "we", "us") is the data controller under Thailand's Personal Data Protection Act B.E. 2562 ("PDPA").
                </p>
                <p>Data Controller: <strong>Nanthipat Niamlang</strong></p>
                <p>Address: Nonthaburi, Thailand</p>
                <p>Contact email: <strong>nanthipat.nia@gmail.com</strong></p>
              </>
            )}
          </Section>

          {/* 2. Data We Collect */}
          <Section title={isTh ? "2. ข้อมูลที่เราเก็บรวบรวม" : "2. Data We Collect"}>
            {isTh ? (
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>ข้อมูลบัญชี:</strong> อีเมล, ชื่อที่แสดง (display name)</li>
                <li><strong>ข้อมูลทางการเงิน:</strong> รายการธุรกรรม, บัญชี, งบประมาณ, หนี้สิน, พอร์ตการลงทุน ที่คุณบันทึกเข้ามาเอง</li>
                <li><strong>ข้อมูล Consent:</strong> เวลาที่ยอมรับข้อตกลง, เวอร์ชันของนโยบาย, User Agent</li>
                <li><strong>ข้อมูลการใช้งาน:</strong> log การเข้าสู่ระบบและกิจกรรมหลักภายในแอป เพื่อการรักษาความปลอดภัย</li>
              </ul>
            ) : (
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Account data:</strong> Email address, display name</li>
                <li><strong>Financial data:</strong> Transactions, accounts, budgets, debts, and investment portfolio you enter yourself</li>
                <li><strong>Consent records:</strong> Timestamp of consent, policy version, browser User Agent</li>
                <li><strong>Usage logs:</strong> Login events and key in-app activities for security purposes</li>
              </ul>
            )}
          </Section>

          {/* 3. Legal Basis & Purpose */}
          <Section title={isTh ? "3. ฐานทางกฎหมายและวัตถุประสงค์" : "3. Legal Basis & Purpose"}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-2 font-semibold">{isTh ? "วัตถุประสงค์" : "Purpose"}</th>
                    <th className="text-left px-4 py-2 font-semibold">{isTh ? "ฐานทางกฎหมาย" : "Legal Basis"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="px-4 py-2">{isTh ? "ให้บริการ ProfitPlanner (บัญชี, พอร์ต, งบประมาณ)" : "Provide ProfitPlanner services (accounts, portfolio, budgets)"}</td>
                    <td className="px-4 py-2">{isTh ? "สัญญา (PDPA มาตรา 24(3))" : "Contract (PDPA §24(3))"}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2">{isTh ? "ความปลอดภัยและป้องกันการทุจริต" : "Security and fraud prevention"}</td>
                    <td className="px-4 py-2">{isTh ? "ประโยชน์อันชอบธรรม (PDPA มาตรา 24(5))" : "Legitimate interest (PDPA §24(5))"}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2">{isTh ? "ส่งข่าวสาร, โปรโมชั่น (เฉพาะที่ยินยอม)" : "Newsletter & promotions (opted-in only)"}</td>
                    <td className="px-4 py-2">{isTh ? "ความยินยอม (PDPA มาตรา 19)" : "Consent (PDPA §19)"}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2">{isTh ? "ปฏิบัติตามกฎหมาย" : "Legal compliance"}</td>
                    <td className="px-4 py-2">{isTh ? "หน้าที่ตามกฎหมาย (PDPA มาตรา 24(6))" : "Legal obligation (PDPA §24(6))"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            {isTh ? (
              <>
                <p className="text-sm">เราไม่ขายข้อมูลส่วนบุคคลหรือข้อมูลทางการเงินของคุณให้กับบุคคลที่สามใด ๆ</p>
                <p className="text-sm">เราไม่จัดเก็บข้อมูลบัตรเครดิต — ข้อมูลการชำระเงินถูกเก็บรักษาและประมวลผลโดย Stripe Inc. โดยตรง</p>
              </>
            ) : (
              <>
                <p className="text-sm">We do not sell your personal or financial data to any third party.</p>
                <p className="text-sm">We do not store credit card data — payment information is stored and processed directly by Stripe Inc.</p>
              </>
            )}
          </Section>

          {/* 4. Data Retention */}
          <Section title={isTh ? "4. ระยะเวลาเก็บรักษาข้อมูล" : "4. Data Retention"}>
            {isTh ? (
              <ul className="list-disc pl-5 space-y-1">
                <li>ข้อมูลบัญชีและข้อมูลทางการเงิน: ตลอดระยะเวลาที่บัญชียังใช้งานอยู่ และลบทันทีเมื่อคุณร้องขอ</li>
                <li>บันทึก Consent: เก็บตลอดไปเพื่อเป็นหลักฐานตามกฎหมาย (ไม่สามารถลบได้)</li>
                <li>Security logs: 90 วัน</li>
                <li>Backup: สูงสุด 30 วันหลังจากลบบัญชี</li>
              </ul>
            ) : (
              <ul className="list-disc pl-5 space-y-1">
                <li>Account & financial data: Retained while your account is active; deleted immediately on request</li>
                <li>Consent records: Retained indefinitely as a legal audit trail (cannot be deleted)</li>
                <li>Security logs: 90 days</li>
                <li>Backups: Up to 30 days after account deletion</li>
              </ul>
            )}
          </Section>

          {/* 5. Third Parties */}
          <Section title={isTh ? "5. การเปิดเผยข้อมูลแก่บุคคลที่สาม" : "5. Third-Party Processors"}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-2 font-semibold">{isTh ? "ผู้ประมวลผล" : "Processor"}</th>
                    <th className="text-left px-4 py-2 font-semibold">{isTh ? "วัตถุประสงค์" : "Purpose"}</th>
                    <th className="text-left px-4 py-2 font-semibold">{isTh ? "ที่ตั้ง" : "Location"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="px-4 py-2">Supabase Inc.</td>
                    <td className="px-4 py-2">{isTh ? "ฐานข้อมูล, Authentication" : "Database, Authentication"}</td>
                    <td className="px-4 py-2">USA / Singapore</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2">Vercel Inc. / Netlify</td>
                    <td className="px-4 py-2">{isTh ? "Hosting" : "Hosting"}</td>
                    <td className="px-4 py-2">USA</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2">Stripe Inc.</td>
                    <td className="px-4 py-2">{isTh ? "ประมวลผลการชำระเงิน (ข้อมูลบัตรเก็บโดย Stripe ไม่ใช่ ProfitPlanner)" : "Payment processing (card data stored by Stripe, not ProfitPlanner)"}</td>
                    <td className="px-4 py-2">USA</td>
                  </tr>
                </tbody>
              </table>
            </div>
            {isTh ? (
              <p className="text-sm">การโอนข้อมูลไปยังต่างประเทศดำเนินการภายใต้มาตรฐานการคุ้มครองที่เพียงพอ (PDPA มาตรา 28)</p>
            ) : (
              <p className="text-sm">International data transfers are conducted under adequate protection standards (PDPA §28).</p>
            )}
          </Section>

          {/* 6. Your Rights */}
          <Section title={isTh ? "6. สิทธิของเจ้าของข้อมูล (PDPA)" : "6. Your Rights Under PDPA"}>
            {isTh ? (
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>สิทธิในการเข้าถึง (มาตรา 30):</strong> ขอดูข้อมูลทั้งหมดของคุณ — ส่งอีเมลถึงเรา หรือใช้ปุ่ม "Export Data" ในหน้า Portal</li>
                <li><strong>สิทธิในการแก้ไข (มาตรา 35):</strong> แก้ไขรายการในแอปได้โดยตรง</li>
                <li><strong>สิทธิในการลบ (มาตรา 33):</strong> ลบบัญชีได้ทันทีในหน้า Portal → Danger Zone</li>
                <li><strong>สิทธิในการระงับการใช้ข้อมูล (มาตรา 34):</strong> ติดต่อ DPO เพื่อขอระงับ</li>
                <li><strong>สิทธิในการโอนข้อมูล (มาตรา 31):</strong> Export ข้อมูลเป็น JSON ได้ทันทีในหน้า Portal</li>
                <li><strong>สิทธิในการคัดค้าน (มาตรา 32):</strong> คัดค้านการประมวลผลด้วยเหตุผลส่วนตัว</li>
                <li><strong>สิทธิถอนความยินยอม (มาตรา 19):</strong> ถอน consent การรับข่าวสารได้ตลอดเวลา โดยติดต่อ nanthipat.nia@gmail.com</li>
              </ul>
            ) : (
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Right of Access (§30):</strong> Request a copy of all your data — email us or use the "Export Data" button on the Portal page</li>
                <li><strong>Right of Rectification (§35):</strong> Edit any entry directly in the app</li>
                <li><strong>Right to Erasure (§33):</strong> Delete your account instantly via Portal → Danger Zone</li>
                <li><strong>Right to Restriction (§34):</strong> Contact our DPO to suspend processing</li>
                <li><strong>Right to Portability (§31):</strong> Export your data as JSON from the Portal page at any time</li>
                <li><strong>Right to Object (§32):</strong> Object to processing on personal grounds</li>
                <li><strong>Right to Withdraw Consent (§19):</strong> Withdraw marketing consent at any time by emailing nanthipat.nia@gmail.com</li>
              </ul>
            )}
            {isTh ? (
              <p className="text-sm">เราจะตอบกลับคำขอภายใน 30 วัน</p>
            ) : (
              <p className="text-sm">We will respond to requests within 30 days.</p>
            )}
          </Section>

          {/* 7. Security */}
          <Section title={isTh ? "7. มาตรการความปลอดภัย" : "7. Security Measures"}>
            {isTh ? (
              <ul className="list-disc pl-5 space-y-1">
                <li>ข้อมูลทั้งหมดเข้ารหัสระหว่างส่ง (TLS 1.2+) และเมื่อจัดเก็บ (AES-256)</li>
                <li>Row Level Security (RLS) ป้องกันไม่ให้ผู้ใช้คนอื่นเห็นข้อมูลของคุณ</li>
                <li>Authentication ผ่าน Supabase (bcrypt password hashing)</li>
                <li>Session token หมดอายุหลัง 7 วัน</li>
              </ul>
            ) : (
              <ul className="list-disc pl-5 space-y-1">
                <li>All data encrypted in transit (TLS 1.2+) and at rest (AES-256)</li>
                <li>Row Level Security (RLS) ensures no user can access another's data</li>
                <li>Authentication via Supabase (bcrypt password hashing)</li>
                <li>Session tokens expire after 7 days</li>
              </ul>
            )}
          </Section>

          {/* 8. Cookies */}
          <Section title={isTh ? "8. Cookies และ Local Storage" : "8. Cookies & Local Storage"}>
            {isTh ? (
              <p>
                เราใช้ Local Storage เพื่อเก็บ session token (ตาม Supabase auth) และค่าตั้งค่าภาษา เราไม่ใช้ tracking cookies จากบุคคลที่สาม
              </p>
            ) : (
              <p>
                We use Local Storage to store session tokens (per Supabase auth) and language preferences. We do not use third-party tracking cookies.
              </p>
            )}
          </Section>

          {/* 9. Changes */}
          <Section title={isTh ? "9. การเปลี่ยนแปลงนโยบาย" : "9. Policy Changes"}>
            {isTh ? (
              <p>
                หากมีการเปลี่ยนแปลงสาระสำคัญ เราจะแจ้งให้ทราบทางอีเมลก่อน 30 วัน
                การใช้งานแอปต่อไปหลังจากวันมีผลบังคับใช้ถือเป็นการยอมรับนโยบายใหม่
              </p>
            ) : (
              <p>
                For material changes we will notify you by email at least 30 days in advance.
                Continued use of the app after the effective date constitutes acceptance of the updated policy.
              </p>
            )}
          </Section>

          {/* 10. PDPC Complaint */}
          <Section title={isTh ? "10. การร้องเรียนต่อ PDPC" : "10. Filing a Complaint with PDPC"}>
            {isTh ? (
              <p>
                หากคุณเชื่อว่าเราละเมิด PDPA คุณมีสิทธิ์ยื่นเรื่องร้องเรียนต่อ
                <strong> สำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล (สคส.)</strong> ได้ที่
                เว็บไซต์ <strong>pdpc.or.th</strong> โทร 02-142-1033
              </p>
            ) : (
              <p>
                If you believe we have violated the PDPA, you may file a complaint with the
                <strong> Office of the Personal Data Protection Committee (PDPC)</strong> at
                <strong> pdpc.or.th</strong> or by calling 02-142-1033.
              </p>
            )}
          </Section>

          {/* Contact */}
          <div className="pt-10 border-t border-border space-y-2 text-sm text-muted-foreground">
            <p>
              {isTh ? "ติดต่อ DPO:" : "Contact DPO:"}{" "}
              <strong>nanthipat.nia@gmail.com</strong>
            </p>
            <p>
              {isTh ? "ดูเพิ่มเติม:" : "See also:"}{" "}
              <Link to="/tos" className="text-primary hover:underline">
                {isTh ? "ข้อตกลงการใช้งาน" : "Terms of Service"}
              </Link>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
