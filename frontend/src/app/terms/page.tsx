'use client'

import Link from 'next/link'
import { ScrollText, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

const sections = [
  {
    title: "Acceptance of Terms",
    content: `By registering and using CampusPulse, you agree to be bound by these Terms of Service. CampusPulse is an official platform of MTI University, designed to deliver AI-powered personalized campus news to students and authorized university stakeholders. If you do not agree to these terms, please do not use the platform.`,
  },
  {
    title: "Eligibility",
    content: `CampusPulse is intended for currently enrolled students of MTI University and authorized university staff and stakeholders. Student accounts are created through self-registration using a valid university email. All other accounts are created and managed by university administration. Guest access is available for public announcements only.`,
  },
  {
    title: "User Responsibilities",
    content: `You are responsible for maintaining the confidentiality of your account credentials. You agree not to share your account with others, attempt to access accounts that do not belong to you, misuse or attempt to manipulate the AI newsletter system, or submit false information during registration. Any violation may result in immediate account suspension.`,
  },
  {
    title: "Content Policy",
    content: `All articles and announcements published on CampusPulse are either AI-generated and reviewed by the Media Adviser, or written directly by authorized university personnel. MTI University reserves the right to approve, reject, or remove any content at its discretion. Users may not reproduce or redistribute content from CampusPulse without written permission.`,
  },
  {
    title: "AI-Generated Content",
    content: `CampusPulse uses artificial intelligence to generate personalized news summaries and newsletters based on your selected interests and campus data. While we strive for accuracy, AI-generated content may occasionally contain errors. All AI content is reviewed by the university Media Adviser before publication. MTI University is not liable for inaccuracies in AI-generated content.`,
  },
  {
    title: "News Preferences",
    content: `You may update your news preferences at any time from your profile page. Your preferences directly influence the content of your personalized newsletter. CampusPulse uses these preferences solely to improve your experience and does not share preference data with third parties.`,
  },
  {
    title: "Account Termination",
    content: `MTI University reserves the right to suspend or terminate any account that violates these Terms of Service, is inactive for an extended period, or belongs to a student who is no longer enrolled at the university. You may also request deletion of your account by contacting the Student Affairs Office.`,
  },
  {
    title: "Limitation of Liability",
    content: `CampusPulse and MTI University are not liable for any indirect, incidental, or consequential damages arising from your use of the platform. The platform is provided on an "as is" basis and may be subject to occasional downtime for maintenance or updates.`,
  },
  {
    title: "Governing Law",
    content: `These Terms of Service are governed by the laws of the Arab Republic of Egypt. Any disputes arising from the use of CampusPulse shall be subject to the jurisdiction of the competent courts in Egypt.`,
  },
  {
    title: "Contact",
    content: `For questions regarding these Terms of Service, please contact the MTI University Student Affairs Office at student.affairs@mti.edu.eg or visit the administration building on campus.`,
  },
]

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[#f8f5f0] dark:bg-slate-950 font-serif text-stone-900 dark:text-stone-100">
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
            <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950 flex items-center justify-center">
              <ScrollText className="h-7 w-7 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="uppercase text-xs tracking-[4px] text-zinc-500 dark:text-zinc-400">
              CampusPulse — MTI University
            </div>
          </div>
          <h1 className="text-5xl md:text-6xl font-black tracking-tight uppercase text-stone-900 dark:text-white">
            Terms of Service
          </h1>
          <p className="mt-5 text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl">
            Please read these terms carefully before using CampusPulse.
            By accessing the platform, you agree to be bound by the following conditions.
          </p>
          <p className="mt-4 text-sm text-zinc-400 dark:text-zinc-500 italic">
            Last updated: April 2026
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-12">
          {sections.map((section, index) => (
            <div key={index} className="border-b border-zinc-200 dark:border-zinc-800 pb-12 last:border-none">
              <div className="flex items-start gap-5">
                <span className="text-3xl font-black text-zinc-200 dark:text-zinc-700 leading-none mt-1 w-8 shrink-0">
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
            <Link href="/privacy" className="text-indigo-600 hover:underline">Privacy Policy</Link>.
          </p>
          <p className="text-xs text-zinc-400 dark:text-zinc-600">
            © {new Date().getFullYear()} CampusPulse — MTI University. All rights reserved.
          </p>
        </div>

      </div>
    </div>
  )
}