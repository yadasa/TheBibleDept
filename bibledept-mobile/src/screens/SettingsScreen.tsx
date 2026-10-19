import { useState } from 'react';
import { useAuth } from '../services/AuthProvider';
import { useTheme } from '../theme';
import { useReadingText } from '../components/ReaderControls';
import { useScreenScroll } from '../components/ScreenScrollView';
import { AccountLink, AccountPage } from '../components/account/AccountPage';
import { AppearancePage } from '../components/account/AppearancePage';
import { ReadingPreferencesPage } from '../components/account/ReadingPreferencesPage';
import { RemindersPage } from '../components/account/RemindersPage';
import { AccountTransition } from '../components/account/AccountTransition';

export type SettingsSection='home'|'appearance'|'reading'|'reminders';
export function SettingsScreen({onBack,initialSection='home'}:{onBack:()=>void;initialSection?:SettingsSection}) {
  const {user}=useAuth(),{mode}=useTheme(),{preferredTranslation}=useReadingText(),top=useScreenScroll(),[page,setPage]=useState<SettingsSection>(initialSection);
  function open(next:SettingsSection){setPage(next);top();}
  if(!user)return null;
  return <AccountTransition pageKey={page}>{page==='appearance'?<AppearancePage onBack={()=>open('home')}/>:page==='reading'?<ReadingPreferencesPage onBack={()=>open('home')}/>:page==='reminders'?<RemindersPage onBack={()=>open('home')} onReadingPreferences={()=>open('reading')}/>:<AccountPage title="Preferences" intro="Appearance, reading, and reminders." onBack={onBack}>
    <AccountLink icon="settings" title="Appearance" detail={`${mode==='dark'?'Dark':'Light'} mode`} onPress={()=>open('appearance')}/>
    <AccountLink icon="book" title="Reading preferences" detail={`${preferredTranslation==='kjv'?'King James Version':'World English Bible'}, text size, and reading days`} onPress={()=>open('reading')}/>
    <AccountLink icon="bell" title="Reminders" detail="Your reading times, quiet hours, and pauses" onPress={()=>open('reminders')}/>
  </AccountPage>}</AccountTransition>;
}
