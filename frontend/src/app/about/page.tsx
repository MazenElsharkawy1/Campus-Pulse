import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Users, Target, Heart, Globe, Mail, MapPin, Phone } from 'lucide-react'

export default function AboutUsPage() {
  const teamMembers = [
    {
      name: 'Loay',
      role: 'Front-end Developer',
      image: '/team/loay.jpg', // replace with real path or placeholder
      bio: 'Leading the front-end experience with clean, responsive design.',
    },
    {
      name: 'Ghofran',
      role: 'Front-end Developer',
      image: '/team/ghofran.jpg',
      bio: 'Crafting intuitive and beautiful user interfaces.',
    },
    {
      name: 'Viola',
      role: 'Back-end Developer',
      image: '/team/viola.jpg',
      bio: 'Building reliable and scalable server-side logic.',
    },
    {
      name: 'Mazen',
      role: 'Back-end & AI Engineer',
      image: '/team/mazen.jpg',
      bio: 'Handling backend architecture and integrating intelligent features.',
    },
    {
      name: 'Fatma',
      role: 'Database Engineer',
      image: '/team/fatma.jpg',
      bio: 'Designing efficient and secure data structures.',
    },
    {
      name: 'Karim',
      role: 'Database Engineer',
      image: '/team/karim.jpg',
      bio: 'Optimizing queries and ensuring data integrity.',
    },
    {
      name: 'Karen',
      role: 'AI Engineer',
      image: '/team/karen.jpg',
      bio: 'Bringing smart features and personalization to CampusPulse.',
    },
  ]

  return (
    <div className="relative min-h-screen bg-[#f8f5f0] dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Subtle background decoration */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none overflow-hidden">
        <div className="absolute -top-20 -left-20 w-[500px] h-[500px] bg-indigo-400/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-400/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-16 lg:py-24">
        {/* Hero */}
        <div className="text-center mb-20 lg:mb-28">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent mb-6">
            CampusPulse
          </h1>
          <p className="text-xl sm:text-2xl text-slate-700 dark:text-slate-300 max-w-4xl mx-auto leading-relaxed font-light">
            Real-time campus news, events, and community — built by MTI students, for MTI students.
          </p>
        </div>

        {/* Mission + Vision */}
        <div className="grid md:grid-cols-2 gap-8 lg:gap-12 mb-20 lg:mb-28">
          <div className="group bg-white dark:bg-slate-800/60 backdrop-blur-md border border-slate-200/70 dark:border-slate-700/50 rounded-2xl p-8 lg:p-10 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
            <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-950/50 flex items-center justify-center mb-6">
              <Target className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-5">Our Mission</h2>
            <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
              Deliver fast, accurate, personalized campus information so every MTI member stays connected and never misses what matters.
            </p>
          </div>

          <div className="group bg-white dark:bg-slate-800/60 backdrop-blur-md border border-slate-200/70 dark:border-slate-700/50 rounded-2xl p-8 lg:p-10 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
            <div className="w-16 h-16 rounded-2xl bg-purple-100 dark:bg-purple-950/50 flex items-center justify-center mb-6">
              <Heart className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-5">Our Vision</h2>
            <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
              Become the central heartbeat of MTI — a vibrant, inclusive digital space where every student feels truly part of the community.
            </p>
          </div>
        </div>

        {/* Who We Are */}
        <div className="text-center mb-16 lg:mb-24">
          <h2 className="text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white mb-6">
            A Project Born at MTI
          </h2>
          <p className="text-lg lg:text-xl text-slate-600 dark:text-slate-300 max-w-4xl mx-auto leading-relaxed">
            Started in early 2026 by seven passionate MTI students who wanted better ways to stay informed and connected.  
            What began as a dorm-room idea is now the go-to platform for thousands across campus.
          </p>
        </div>

        {/* Team Section */}
        <div className="mb-20 lg:mb-28">
          <h2 className="text-4xl lg:text-5xl font-bold text-center text-slate-900 dark:text-white mb-12">
            Meet the Team
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 lg:gap-10">
            {teamMembers.map((member) => (
              <div
                key={member.name}
                className="group bg-white dark:bg-slate-800/60 backdrop-blur-md border border-slate-200/70 dark:border-slate-700/50 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
              >
                <div className="relative aspect-square overflow-hidden bg-slate-200 dark:bg-slate-700">
                  <Image
                    src={member.image || '/team/placeholder.jpg'}
                    alt={member.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="p-6 text-center">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
                    {member.name}
                  </h3>
                  <p className="text-indigo-600 dark:text-indigo-400 font-medium mb-3">
                    {member.role}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {member.bio}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Values */}
        <div className="mb-20 lg:mb-28">
          <h2 className="text-4xl font-bold text-center text-slate-900 dark:text-white mb-12">
            Our Core Values
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Globe, title: "Community First", text: "Built for students, by students — always listening to what you need." },
              { icon: Users, title: "Inclusivity", text: "Every faculty, club, event, and voice deserves visibility." },
              { icon: Target, title: "Accuracy & Speed", text: "Real-time, verified updates so you stay ahead of everything." },
            ].map((value, i) => (
              <div
                key={i}
                className="bg-white/80 dark:bg-slate-800/70 backdrop-blur-md border border-slate-200/70 dark:border-slate-700/50 rounded-2xl p-8 text-center shadow-lg hover:shadow-xl transition-all hover:-translate-y-1"
              >
                <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-indigo-100 to-blue-100 dark:from-indigo-950/50 dark:to-blue-950/50 flex items-center justify-center">
                  <value.icon className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                  {value.title}
                </h3>
                <p className="text-slate-600 dark:text-slate-300">
                  {value.text}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div className="text-center bg-gradient-to-br from-indigo-50/70 to-purple-50/70 dark:from-indigo-950/30 dark:to-purple-950/30 backdrop-blur-lg border border-indigo-200/50 dark:border-indigo-800/40 rounded-3xl p-10 lg:p-16 shadow-2xl">
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-6">
            Let’s Stay Connected
          </h2>
          <p className="text-lg text-slate-700 dark:text-slate-300 mb-10 max-w-3xl mx-auto">
            Questions? Ideas? Want to join the team? We’re always happy to hear from the MTI community.
          </p>

          <div className="flex flex-col sm:flex-row gap-5 justify-center mb-10">
            <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-md" asChild>
              <a href="mailto:support@campuspulse.edu">
                <Mail className="h-5 w-5" />
                Email Us
              </a>
            </Button>
            <Button size="lg" variant="outline" className="border-2 gap-2" asChild>
              <a href="https://instagram.com/campuspulse" target="_blank" rel="noopener noreferrer">
                Follow on Instagram
              </a>
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-slate-600 dark:text-slate-400 text-sm">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              MTI University, Cairo, Egypt
            </div>
            <div className="hidden sm:block">•</div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              +20 123 456 7890
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}