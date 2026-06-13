'use client';

import { motion } from 'framer-motion';
import {
  User, Mail, Building, Hash, GraduationCap,
  BookOpen, Award, Bell, Moon, Globe, Shield,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { mockUser } from '@/lib/mockData';

const profileFields = [
  { label: 'Full Name', value: mockUser.name, icon: User },
  { label: 'Email', value: mockUser.email, icon: Mail },
  { label: 'Roll Number', value: mockUser.rollNumber, icon: Hash },
  { label: 'Department', value: mockUser.major, icon: BookOpen },
  { label: 'Semester', value: `Semester ${mockUser.semester}`, icon: GraduationCap },
  { label: 'CGPA', value: `${mockUser.cgpa} / 10.0`, icon: Award },
  { label: 'Hostel Room', value: mockUser.hostelRoom, icon: Building },
];

const settingsSections = [
  {
    title: 'Notifications',
    icon: Bell,
    settings: [
      { label: 'Assignment reminders', enabled: true },
      { label: 'Attendance alerts', enabled: true },
      { label: 'Placement notifications', enabled: true },
      { label: 'Hostel notices', enabled: false },
    ],
  },
  {
    title: 'Appearance',
    icon: Moon,
    settings: [
      { label: 'Dark mode (always on)', enabled: true },
      { label: 'Compact view', enabled: false },
      { label: 'Animations', enabled: true },
    ],
  },
  {
    title: 'AI Preferences',
    icon: Globe,
    settings: [
      { label: 'Auto-summarize notices', enabled: true },
      { label: 'Proactive deadline alerts', enabled: true },
      { label: 'WhatsApp message extraction', enabled: true },
    ],
  },
  {
    title: 'Privacy & Security',
    icon: Shield,
    settings: [
      { label: 'Share analytics with campus', enabled: false },
      { label: 'Two-factor authentication', enabled: true },
      { label: 'Data stored on AWS (encrypted)', enabled: true },
    ],
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-100">Settings</h2>
        <p className="text-sm text-slate-500 mt-1">
          Manage your profile, notifications, and AI preferences.
        </p>
      </div>

      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profile Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-800">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-xl font-bold text-white shadow-lg shadow-violet-500/20">
                {mockUser.name.split(' ').map((n) => n[0]).join('')}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-100">{mockUser.name}</h3>
                <p className="text-sm text-slate-400">{mockUser.major}</p>
                <Badge className="mt-1 text-[10px] bg-cyan-500/15 text-cyan-400 border-cyan-500/30">
                  Semester {mockUser.semester} · CGPA {mockUser.cgpa}
                </Badge>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profileFields.map(({ label, value, icon: Icon }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/30 border border-slate-800"
                >
                  <Icon className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</p>
                    <p className="text-sm text-slate-200">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Settings Sections */}
      {settingsSections.map((section, sIdx) => (
        <motion.div
          key={section.title}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + sIdx * 0.08, duration: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <section.icon className="w-4 h-4 text-cyan-400" />
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {section.settings.map((setting) => (
                  <div
                    key={setting.label}
                    className="flex items-center justify-between py-2"
                  >
                    <span className="text-sm text-slate-300">{setting.label}</span>
                    <button
                      className={`w-10 h-5 rounded-full transition-colors relative ${
                        setting.enabled ? 'bg-cyan-500' : 'bg-slate-700'
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                          setting.enabled ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}

      {/* AWS Integration badge */}
      <Card className="border-cyan-500/20 bg-gradient-to-r from-cyan-500/5 to-violet-500/5">
        <CardContent className="py-4 px-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-200">Secured by AWS</p>
              <p className="text-xs text-slate-500">
                All data encrypted with AES-256. Stored on Amazon S3 with Bedrock RAG indexing.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
