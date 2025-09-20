import React, { createContext, useContext, useReducer, ReactNode, useEffect, useRef } from 'react';
import realtimeService from '../services/realtimeService';
import { Reminder, Alert, AppActionAll, Memory, EventLogItem, SharedQuote, VoiceMessage, SenderRole, CurrentUser, ViewMode } from '../types';
// Import bundled voice message samples so deploys (e.g., Vercel) include them and avoid 404s
import voiceLeo from '../assets/audio/voice_leo.mp3';
import voiceSam from '../assets/audio/voice_sam.mp3';
const VOICE_MESSAGE_LEO_URL = voiceLeo;
const VOICE_MESSAGE_SAM_URL = voiceSam;

interface AppState {
  reminders: Reminder[];
  alerts: Alert[];
  memories: Memory[];
  eventLog: EventLogItem[];
  sharedQuote: SharedQuote | null;
  voiceMessages: VoiceMessage[];
  currentUser?: { username: string; role?: string } | null;
  devMode?: boolean;
  currentView?: ViewMode;
}

const initialState: AppState = {
  // Start with no pre-existing demo reminders. Caregivers can add reminders using the UI.
  reminders: [],
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
      audioUrl: VOICE_MESSAGE_LEO_URL,
          duration: 1,
          senderRole: SenderRole.FAMILY, 
          senderName: 'Your Grandson, Leo',
          timestamp: '10:30 AM'
      },
       { 
          id: 'vm2', 
       audioUrl: VOICE_MESSAGE_SAM_URL,
          duration: 1,
          senderRole: SenderRole.CAREGIVER, 
          senderName: 'Your Caregiver, Sam',
          timestamp: '11:15 AM'
      },
  ],
  currentUser: null,
  devMode: false,
  currentView: ViewMode.PATIENT,
};

const appReducer = (state: AppState, action: AppActionAll): AppState => {
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
      const newAlert = { ...action.payload };
      if (newAlert.type === 'SOS' || newAlert.type === 'FALL') {
          newAlert.requiresAcknowledgement = true;
      }
      return {
        ...state,
        alerts: [newAlert, ...state.alerts],
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
  case 'UPDATE_VOICE_MESSAGE_DURATION':
    return {
      ...state,
      voiceMessages: state.voiceMessages.map(vm =>
        vm.id === action.payload.id ? { ...vm, duration: action.payload.duration } : vm
      )
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
    case 'ACKNOWLEDGE_ALERTS':
        return {
            ...state,
            alerts: state.alerts.map(alert =>
                (alert.type === 'SOS' || alert.type === 'FALL')
                ? { ...alert, requiresAcknowledgement: false }
                : alert
            ),
        };
    case 'MARK_REMINDER_NOTIFIED':
        return {
            ...state,
            reminders: state.reminders.map(r =>
                r.id === action.payload ? { ...r, notified: true } : r
            ),
        };
    case 'LOGIN_SUCCESS':
      // Record the logged-in user but do NOT auto-switch the current view.
      // The UI should present a dashboard selector after demo login and then
      // dispatch 'SET_VIEW_MODE' explicitly. This keeps behavior consistent
      // when using the demo selector to choose which dashboard to open.
      return {
        ...state,
        currentUser: action.payload,
      };
    case 'LOGOUT':
      return {
        ...state,
        currentUser: null,
      };
    case 'SET_DEV_MODE':
      return {
        ...state,
        devMode: action.payload,
      };
    case 'SET_VIEW_MODE':
      return {
        ...state,
        currentView: action.payload,
      };
    default:
      return state;
  }
};

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppActionAll>;
} | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const appliedRemoteActions = useRef(new Set<string>());

  useEffect(() => {
    // If demo realtime URL is provided via global, connect automatically for presentations.
    const wsUrl = (window as any).__DEMO_REALTIME_URL as string | undefined;
    if (!wsUrl) return;

    realtimeService.connect(wsUrl);

    // Register incoming actions to apply remotely
    realtimeService.onAction((action: any) => {
      try {
        // Ignore if it's already applied (simple dedupe using an id)
        const rid = action?._remoteId;
        if (rid && appliedRemoteActions.current.has(rid)) return;
        if (rid) appliedRemoteActions.current.add(rid);
        // Dispatch the remote action locally
        dispatch(action);
      } catch (e) {
        console.warn('Error applying remote action', e);
      }
    });

    return () => {
      realtimeService.disconnect();
    };
  }, []);

  // Wrap dispatch to optionally forward actions to the realtime server when enabled
  const wrappedDispatch: React.Dispatch<AppActionAll> = (action) => {
    // Forward to realtime server if configured
    const wsUrl = (window as any).__DEMO_REALTIME_URL as string | undefined;
    if (wsUrl && realtimeService) {
      try {
        // Add a small remote id to help dedupe
        const actionToSend = { ...action, _remoteId: (action as any)._remoteId || `r-${Date.now()}-${Math.random().toString(36).slice(2,8)}` };
        realtimeService.sendAction(actionToSend);
      } catch (e) {
        console.warn('Failed to send action to realtime server', e);
      }
    }
    // Apply locally
    dispatch(action as any);
  };

  return (
    <AppContext.Provider value={{ state, dispatch: wrappedDispatch }}>
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