import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Twitter, Instagram, Linkedin, Github, Mail, Facebook, FacebookIcon } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="relative bg-linear-to-b from-slate-900 to-slate-950 text-slate-300 border-t border-slate-800/50 mt-auto">
      {/* Subtle overlay gradient */}
      <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-12">
          {/* Brand & description */}
          <div className="md:col-span-2 space-y-6">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative">
                <Image
                  src="/logo.jfif"
                  alt="CampusPulse Logo"
                  width={48}
                  height={48}
                  className="rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300"
                />
                <div className="absolute inset-0 rounded-xl bg-linear-to-br from-indigo-500/30 to-blue-500/30 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <span className="text-2xl md:text-3xl font-bold bg-linear-to-r from-indigo-400 to-blue-400 bg-clip-text text-transparent">
                CampusPulse
              </span>
            </Link>

            <p className="text-slate-400 leading-relaxed max-w-md">
              Your university's central hub for real-time news, events, announcements, and campus life. Stay connected, stay informed.
            </p>

            {/* Social icons */}
            <div className="flex gap-5 mt-6">
              
              <a href="https://www.instagram.com/mtiuniversity?igsh=MWd0azVpZXEwejVnZg==" className="text-slate-400 hover:text-pink-400 transition-colors">
                <Instagram size={20} />
              </a>
              
             <a href="https://www.facebook.com/share/1BMMHdESPX/" className="text-slate-400 hover:text-pink-400 transition-colors">
                <Facebook size={20} />
              </a>
              
            </div>
          </div>

          {/* Quick links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Quick Links</h3>
            <ul className="space-y-3 text-slate-400">
              <li><Link href="/gallery" className="hover:text-indigo-400 transition-colors">Gallery</Link></li>
              <li><Link href="/about" className="hover:text-indigo-400 transition-colors">About Us</Link></li>
              <li><Link href="/policy" className="hover:text-indigo-400 transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-indigo-400 transition-colors">Terms of Service</Link></li>
              <li><Link href="/faq" className="hover:text-indigo-400 transition-colors">FAQ</Link></li>
              <li><Link href="/contact" className="hover:text-indigo-400 transition-colors">Contact Us</Link></li>
            </ul>
          </div>

          {/* Contact & legal */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Get in Touch</h3>
            <ul className="space-y-3 text-slate-400">
              <li className="flex items-center gap-3">
                <Mail size={16} />
                support@campuspulse.edu
              </li>
              <li className="flex items-center gap-3">
                <span>📍</span>
                MTI University, Cairo, Egypt
              </li>
            </ul>

            <div className="pt-4">
              <p className="text-sm text-slate-500">
                © {new Date().getFullYear()} CampusPulse. All rights reserved.
              </p>
            </div>
          </div>
        </div>

        
      </div>
    </footer>
  )
}