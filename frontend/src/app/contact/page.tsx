'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Mail, Phone, MapPin, Send, CheckCircle, HelpCircle } from 'lucide-react'

export default function ContactUs() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    await new Promise(resolve => setTimeout(resolve, 1300))
    console.log('Contact form submitted:', formData)
    setSubmitted(true)
    setIsSubmitting(false)
  }

  if (submitted) {
    return (
      <div className="min-h-screen  bg-white dark:bg-slate-950 flex items-center justify-center px-6 font-serif">
        <div className="max-w-md text-center">
          <div className="mx-auto w-24 h-24 bg-emerald-100 dark:bg-emerald-950 rounded-none flex items-center justify-center mb-8 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle className="h-12 w-12 text-emerald-700 dark:text-emerald-400" />
          </div>
          <h2 className="text-5xl font-bold tracking-tight mb-4 text-black dark:text-white">
            Message Sent!
          </h2>
          <p className="text-xl text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Thank you for reaching out.<br />
            We will reply as soon as possible.
          </p>
          <Button
            onClick={() => {
              setSubmitted(false)
              setFormData({ name: '', email: '', subject: '', message: '' })
            }}
            size="lg"
            className="mt-10 h-14 px-10 text-lg border-2 border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black"
          >
            Send Another Message
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 font-serif pb-24">

      <div className="max-w-4xl mx-auto px-6 py-16 mt-10">
        {/* Page Header */}
        <div className="text-center border-b border-zinc-300 dark:border-zinc-700 pb-12 mb-16">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="w-11 h-11 bg-amber-100 dark:bg-amber-950 rounded-full flex items-center justify-center">
              <Mail className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <h1 className="text-6xl font-bold tracking-tight text-black dark:text-white">
            Get in Touch
          </h1>
          <p className="mt-6 text-xl text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto">
            Have a question or need assistance? Reach out to us directly.
          </p>
        </div>

        {/* Main Form Card */}
        <div className="bg-white dark:bg-slate-900 border border-zinc-300 dark:border-zinc-700 rounded-none shadow-sm p-10 md:p-14">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold mb-2 text-zinc-700 dark:text-zinc-300">
                  Full Name
                </label>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Ahmed Mohamed"
                  required
                  className="h-14 text-base rounded-none border-zinc-300 dark:border-zinc-700 focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-zinc-700 dark:text-zinc-300">
                  Email Address
                </label>
                <Input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="your@email.com"
                  required
                  className="h-14 text-base rounded-none border-zinc-300 dark:border-zinc-700 focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-zinc-700 dark:text-zinc-300">
                Subject
              </label>
              <Select onValueChange={(value) => setFormData({ ...formData, subject: value })}>
                <SelectTrigger className="h-14 text-base rounded-none border-zinc-300 dark:border-zinc-700 focus:border-amber-500">
                  <SelectValue placeholder="What is this about?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="General Inquiry">General Inquiry</SelectItem>
                  <SelectItem value="Technical Support">Technical Support</SelectItem>
                  <SelectItem value="Suggestion">Suggestion / Feedback</SelectItem>
                  <SelectItem value="Partnership">Partnership / Collaboration</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-zinc-700 dark:text-zinc-300">
                Your Message
              </label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                placeholder="Write your message here..."
                rows={8}
                required
                className="w-full rounded-none border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-slate-900 px-6 py-5 text-base focus:outline-none focus:border-amber-500 resize-none"
              />
            </div>

            {/* Colored Send Button */}
            <Button
              type="submit"
              disabled={isSubmitting}
              size="lg"
              className="w-full h-16 text-xl font-semibold bg-blue-500 hover:bg-blue-700 text-white border-2  rounded-none flex items-center justify-center gap-3 transition-all"
            >
              {isSubmitting ? (
                'Sending Message...'
              ) : (
                <>
                  <Send className="h-6 w-6" />
                  Send Message
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Quick Contact Info - Colored */}
        <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-10 text-center">
          
          {/* Email */}
          <div className="flex flex-col items-center group">
            <div className="w-14 h-14 flex items-center justify-center mb-4 group-hover:border-rose-300 transition-colors rounded-none">
              <Mail className="h-7 w-7 text-rose-600 dark:text-rose-400" />
            </div>
            <p className="font-semibold text-lg">Email</p>
            <a 
              href="mailto:info@mti.edu.eg" 
              className="text-rose-600 dark:text-rose-400 hover:underline mt-2 block text-lg"
            >
              info@mti.edu.eg
            </a>
          </div>

          {/* Phone */}
          <div className="flex flex-col items-center group">
            <div className="w-14 h-14 flex items-center justify-center mb-4 group-hover:border-teal-300 transition-colors rounded-none">
              <Phone className="h-7 w-7 text-teal-600 dark:text-teal-400" />
            </div>
            <p className="font-semibold text-lg">Phone</p>
            <a 
              href="tel:+20123456789" 
              className="text-teal-600 dark:text-teal-400 hover:underline mt-2 block text-lg"
            >
              19041
            </a>
          </div>

          {/* Location */}
          <div className="flex flex-col items-center group">
            <div className="w-14 h-14  flex items-center justify-center mb-4 group-hover:border-amber-300 transition-colors rounded-none">
              <MapPin className="h-7 w-7 text-amber-600 dark:text-amber-400" />
            </div>
            <p className="font-semibold text-lg">Location</p>
            <p className="text-amber-600 dark:text-amber-400 mt-2 text-lg">
              Al Mokkatam, Egypt
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}