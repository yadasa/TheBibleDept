import { useHabit } from '../../services/HabitProvider';
import { ReminderSettings } from '../ReminderSettings';
import { ActionButton, Notice } from '../ui';
import { AccountPage } from './AccountPage';

export function RemindersPage({onBack,onReadingPreferences}:{onBack:()=>void;onReadingPreferences:()=>void}) {
  const habit=useHabit();
  return <AccountPage title="Reminders" intro="Choose when you’d like a reminder to read." onBack={onBack} backLabel="Back to preferences">
    {!habit.loading&&!habit.ready&&<><Notice text="Choose your reading time zone before setting up reminders."/><ActionButton title="Choose reading time zone" secondary icon="calendar" onPress={onReadingPreferences}/></>}
    <ReminderSettings/>
  </AccountPage>;
}
