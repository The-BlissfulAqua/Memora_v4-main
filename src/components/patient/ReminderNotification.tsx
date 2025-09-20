import { useEffect } from 'react';
import NotificationSound from '../shared/NotificationSound';
import { useAppContext } from '../../context/AppContext';

const ReminderNotification: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const { reminders } = state;

  function isReminderDue(reminderTime: string) {
    const now = new Date();
    const [h, m] = reminderTime.split(':');
    const reminderDate = new Date(now);
    reminderDate.setHours(Number(h), Number(m), 0, 0);
    return now >= reminderDate;
  }

  const dueReminder = reminders.find((r: any) => !r.completed && !r.notified && isReminderDue(r.time));

  useEffect(() => {
    if (dueReminder) {
      dispatch({ type: 'MARK_REMINDER_NOTIFIED', payload: dueReminder.id });
    }
  }, [dueReminder, dispatch]);

  return <NotificationSound trigger={!!dueReminder} />;
};

export default ReminderNotification;
