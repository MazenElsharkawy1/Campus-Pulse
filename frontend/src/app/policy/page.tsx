'use client'

import Link from 'next/link'
import { Shield, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

const sections = [
  {
    title: "Information We Collect",
    content: `When you register on CampusPulse, we collect personal information including your full name, university email address, phone number, date of birth, and news preferences. We also collect usage data such as articles you read, newsletters you open, and categories you interact with. This information is used solely to personalize your campus news experience.`,
  },
  {
    title: "How We Use Your Information",
    content: `Your information is used to generate a personalized AI-powered newsletter based on your selected interests, to send you relevant campus news and announcements, to improve the quality and relevance of content on CampusPulse, and to communicate important university updates. We do not use your data for advertising or sell it to third parties.`,
  },
  {
    title: "Data Sharing",
    content: `CampusPulse is an internal platform operated by MTI University. Your personal data may be accessible to authorized university staff including the Media Adviser, University Manager, and designated administrative roles solely for the purpose of managing the platform. Data is never shared with external organizations without your explicit consent.`,
  },
  {
    title: "Data Security",
    content: `We take reasonable technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction. Your password is encrypted and never stored in plain text. Access to personal data is restricted to authorized personnel only.`,
  },
  {
    title: "Your Rights",
    content: `You have the right to access the personal data we hold about you, request corrections to inaccurate information, update your news preferences at any time from your profile page, and request deletion of your account by contacting the university administration. To exercise any of these rights, please contact us at the email provided below.`,
  },
  {
    title: "Cookies",
    content: `CampusPulse uses minimal session-based cookies to keep you logged in and maintain your preferences. We do not use third-party tracking cookies or advertising cookies. You can clear cookies at any time through your browser settings, though this will log you out of the platform.`,
  },
  {
    title: "Changes to This Policy",
    content: `MTI University reserves the right to update this Privacy Policy at any time. Any significant changes will be announced through the official CampusPulse announcements section. Continued use of the platform after changes are posted constitutes your acceptance of the updated policy.`,
  },
  {
    title: "Contact",
    content: `If you have any questions or concerns about this Privacy Policy, please contact the MTI University Student Affairs Office at student.affairs@mti.edu.eg or visit the administration building on campus.`,
  },
]

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 font-serif text-stone-900 dark:text-stone-100">
      <div className="max-w-4xl mx-auto px-6 py-16 mt-10">

        {/* Back Button */}
        <Button variant="ghost" asChild className="mb-10 text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white">
          <Link href="/">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Home
          </Link>
        </Button>

        {/* Header */}
        <div className="border-b-2 border-stone-800 dark:border-stone-200 pb-10 mb-14">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center">
              <Shield className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="uppercase text-xs tracking-[4px] text-zinc-500 dark:text-zinc-400">
              CampusPulse — MTI University
            </div>
          </div>
          <h1 className="text-5xl md:text-6xl font-black tracking-tight uppercase text-stone-900 dark:text-white">
            Privacy Policy
          </h1>
          <p className="mt-5 text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl">
            Your privacy matters to us. This policy explains how MTI University collects,
            uses, and protects your personal information on the CampusPulse platform.
          </p>
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-500 italic">
            Last updated: April 2026
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-12">
          {sections.map((section, index) => (
            <div key={index} className="border-b border-zinc-400 dark:border-zinc-800 pb-12 last:border-none">
              <div className="flex items-start gap-5">
                <span className="text-3xl font-black text-zinc-500 dark:text-zinc-700 leading-none mt-1 w-8 shrink-0">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold text-stone-900 dark:text-white">
                    {section.title}
                  </h2>
                  <p className="text-[17px] leading-relaxed text-zinc-700 dark:text-zinc-300">
                    {section.content}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Note */}
        <div className="mt-16 pt-10 border-t-2 border-stone-800 dark:border-stone-200 text-center space-y-3">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            For questions, visit our{' '}
            <Link href="/contact" className="text-indigo-600 hover:underline">Contact Us</Link>
            {' '}page or review our{' '}
            <Link href="/terms" className="text-indigo-600 hover:underline">Terms of Service</Link>.
          </p>
          <p className="text-xs text-zinc-400 dark:text-zinc-600">
            © {new Date().getFullYear()} CampusPulse — MTI University. All rights reserved.
          </p>
        </div>

      </div>
    </div>
  )
}