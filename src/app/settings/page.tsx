'use client';

import { motion } from 'framer-motion';
import {
  User, Mail, Building, Hash, GraduationCap,
  BookOpen, Award, Bell, Moon, Globe, Shield,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/store/useAppStore';

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

import { useState } from 'react';

export default function SettingsPage() {
  const profile = useAppStore((s) => s.profile);
  const updateProfile = useAppStore((s) => s.updateProfile);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: profile?.name || '',
    rollNumber: profile?.rollNumber || '',
    major: profile?.major || '',
    semester: profile?.semester || 1,
    cgpa: profile?.cgpa || 0,
    hostelRoom: profile?.hostelRoom || '',
  });

  const handleSave = async () => {
    await updateProfile(editForm);
    setIsEditing(false);
  };

  const profileFields = [
    { label: 'Full Name', value: profile?.name || 'Loading...', icon: User },
    { label: 'Email', value: profile?.email || 'Loading...', icon: Mail },
    { label: 'Roll Number', value: profile?.rollNumber || 'Loading...', icon: Hash },
    { label: 'Department', value: profile?.major || 'Loading...', icon: BookOpen },
    { label: 'Semester', value: `Semester ${profile?.semester || 1}`, icon: GraduationCap },
    { label: 'CGPA', value: `${profile?.cgpa || 0} / 10.0`, icon: Award },
    { label: 'Hostel Room', value: profile?.hostelRoom || 'Loading...', icon: Building },
  ];

  return (
    <div className="space-y-6 max-w-4xl pb-20">
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
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Profile Information</CardTitle>
            <button
              onClick={() => {
                if (isEditing) {
                  handleSave();
                } else {
                  setEditForm({
                    name: profile?.name || '',
                    rollNumber: profile?.rollNumber || '',
                    major: profile?.major || '',
                    semester: profile?.semester || 1,
                    cgpa: profile?.cgpa || 0,
                    hostelRoom: profile?.hostelRoom || '',
                  });
                  setIsEditing(true);
                }
              }}
              className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-md transition-colors"
            >
              {isEditing ? 'Save Changes' : 'Edit Profile'}
            </button>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-800">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-xl font-bold text-white shadow-lg shadow-violet-500/20">
                {profile?.name ? profile.name.split(' ').map((n) => n[0]).join('') : 'U'}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-100">{profile?.name || 'User'}</h3>
                <p className="text-sm text-slate-400">{profile?.major || 'B.Tech'}</p>
                <Badge className="mt-1 text-[10px] bg-cyan-500/15 text-cyan-400 border-cyan-500/30">
                  Semester {profile?.semester || 1} · CGPA {profile?.cgpa || 0}
                </Badge>
              </div>
            </div>
            
            {isEditing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider">Full Name</label>
                  <input 
                    type="text" 
                    value={editForm.name} 
                    onChange={e => setEditForm({...editForm, name: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider">Roll Number</label>
                  <input 
                    type="text" 
                    value={editForm.rollNumber} 
                    onChange={e => setEditForm({...editForm, rollNumber: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider">Department</label>
                  <input 
                    type="text" 
                    value={editForm.major} 
                    onChange={e => setEditForm({...editForm, major: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider">Semester</label>
                  <input 
                    type="number" 
                    value={editForm.semester} 
                    onChange={e => setEditForm({...editForm, semester: parseInt(e.target.value) || 1})}
                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider">CGPA</label>
                  <input 
                    type="number" step="0.01" 
                    value={editForm.cgpa} 
                    onChange={e => setEditForm({...editForm, cgpa: parseFloat(e.target.value) || 0})}
                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider">Hostel Room</label>
                  <input 
                    type="text" 
                    value={editForm.hostelRoom} 
                    onChange={e => setEditForm({...editForm, hostelRoom: e.target.value})}
                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-slate-200"
                  />
                </div>
              </div>
            ) : (
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
            )}
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
