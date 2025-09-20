
import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { Reminder, Alert, AppAction, Memory, EventLogItem, SharedQuote, VoiceMessage, SenderRole } from '../types';

interface AppState {
  reminders: Reminder[];
  alerts: Alert[];
  memories: Memory[];
  eventLog: EventLogItem[];
  sharedQuote: SharedQuote | null;
  voiceMessages: VoiceMessage[];
}

const initialState: AppState = {
  reminders: [
    { id: '1', title: 'Take Morning Pills', time: '08:00 AM', completed: false, icon: 'medication' },
    { id: '2', title: 'Eat Breakfast', time: '08:30 AM', completed: false, icon: 'meal' },
    { id: '3', title: 'Drink a glass of water', time: '10:00 AM', completed: false, icon: 'hydration' },
  ],
  alerts: [],
  memories: [
    {
      id: 'mem1',
      imageUrl: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?q=80&w=800&auto=format&fit=crop',
      caption: 'That wonderful day we spent at the beach with the grandkids. Remember how much they loved the ice cream?',
      sharedBy: 'Your Daughter, Jane'
    }
  ],
  eventLog: [
    { id: 'ev1', text: 'Caregiver scheduled "Take Morning Pills".', timestamp: new Date().toLocaleString(), icon: 'task' }
  ],
  sharedQuote: {
    id: 'q1',
    text: 'Just a little note to say we are thinking of you today!',
    timestamp: new Date().toLocaleString()
  },
  voiceMessages: [
      { 
          id: 'vm1', 
          // Public domain bird sound from Webalketa on Pixabay
          audioUrl: 'https://cdn.pixabay.com/audio/2022/03/24/audio_32c25b7b9c.mp3',
          duration: 4,
          senderRole: SenderRole.FAMILY, 
          senderName: 'Your Grandson, Leo',
          timestamp: '10:30 AM'
      },
       { 
          id: 'vm2', 
          // Public domain water stream sound from AlesiaDavina on Pixabay
          audioUrl: 'https://cdn.pixabay.com/audio/2024/05/27/audio_2911a86657.mp3',
          duration: 9,
          senderRole: SenderRole.CAREGIVER, 
          senderName: 'Your Caregiver, Sam',
          timestamp: '11:15 AM'
      },
  ],
};

const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'COMPLETE_REMINDER':
      const completedReminder = state.reminders.find(r => r.id === action.payload);
      const newCompleteEvent: EventLogItem = {
          id: new Date().toISOString(),
          text: `Patient marked "${completedReminder?.title}" as complete.`,
          timestamp: new Date().toLocaleString(),
          icon: 'reminder'
      };
      return {
        ...state,
        reminders: state.reminders.map((r) =>
          r.id === action.payload ? { ...r, completed: true } : r
        ),
        eventLog: [newCompleteEvent, ...state.eventLog],
      };
    case 'ADD_REMINDER':
        const newReminderEvent: EventLogItem = {
            id: new Date().toISOString(),
            text: `Caregiver scheduled "${action.payload.title}".`,
            timestamp: new Date().toLocaleString(),
            icon: 'task'
        };
      return {
        ...state,
        reminders: [...state.reminders, action.payload],
        eventLog: [newReminderEvent, ...state.eventLog],
      };
    case 'DELETE_REMINDER':
        return {
            ...state,
            reminders: state.reminders.filter(r => r.id !== action.payload)
        }
    case 'TRIGGER_SOS':
      const sosMessage = action.payload.type === 'FALL'
        ? 'Potential fall detected!'
        : 'Patient triggered an SOS alert!';
      const newSosEvent: EventLogItem = {
        id: new Date().toISOString(),
        text: sosMessage,
        timestamp: new Date().toLocaleString(),
        icon: action.payload.type === 'FALL' ? 'fall' : 'sos'
      };
      return {
        ...state,
        alerts: [action.payload, ...state.alerts],
        eventLog: [newSosEvent, ...state.eventLog],
      };
    case 'ADD_MEMORY':
      const newMemoryEvent: EventLogItem = {
        id: new Date().toISOString(),
        text: `${action.payload.sharedBy} shared a new memory.`,
        timestamp: new Date().toLocaleString(),
        icon: 'memory'
      };
      return {
          ...state,
          memories: [action.payload, ...state.memories],
          eventLog: [newMemoryEvent, ...state.eventLog],
      };
    case 'ADD_QUOTE':
        return {
            ...state,
            sharedQuote: action.payload
        };
    case 'ADD_VOICE_MESSAGE':
        return {
            ...state,
            voiceMessages: [action.payload, ...state.voiceMessages]
        };
    case 'LOG_EMOTION':
      // Do not create duplicate emotion alerts in quick succession
      if (state.alerts[0]?.type === 'EMOTION' && state.alerts[0]?.message.includes(action.payload.emotion)) {
        return state;
      }
      const newEmotionAlert: Alert = {
          id: new Date().toISOString(),
          message: `Patient may be feeling: ${action.payload.emotion}`,
          timestamp: new Date().toLocaleString(),
          type: 'EMOTION',
      };
      const newEmotionEvent: EventLogItem = {
          id: new Date().toISOString(),
          text: `AI companion detected emotion: ${action.payload.emotion}.`,
          timestamp: new Date().toLocaleString(),
          icon: 'emotion',
      };
      return {
          ...state,
          alerts: [newEmotionAlert, ...state.alerts],
          eventLog: [newEmotionEvent, ...state.eventLog],
      };
    default:
      return state;
  }
};

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
