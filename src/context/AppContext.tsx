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
  const latestViewRef = useRef(state.currentView);

  // keep latestViewRef up-to-date so realtime callbacks can decide whether
  // to apply incoming actions based on the current dashboard view.
  useEffect(() => {
    latestViewRef.current = state.currentView;
  }, [state.currentView]);

  useEffect(() => {
    // Always register incoming actions so AppContext can apply remote actions
    // even if the websocket is connected later (for example via the LoginPage).
    const unsubscribe = realtimeService.onAction((action: any) => {
      try {
        // Ignore if it's already applied (simple dedupe using an id)
        const rid = action?._remoteId;
        if (rid && appliedRemoteActions.current.has(rid)) return;
        if (rid) appliedRemoteActions.current.add(rid);

        // Decide whether to apply this remote action locally based on type
        // and the current dashboard view. This lets the server broadcast
        // to all clients but have each client selectively apply actions
        // (e.g., reminders and memories apply only to PATIENT view).
        const view = latestViewRef.current;

        const applyAction = (act: any) => dispatch(act);

        switch (action?.type) {
          // UI-only actions: never propagate from remote
          case 'SET_VIEW_MODE':
          case 'LOGIN_SUCCESS':
          case 'SET_DEV_MODE':
            // ignore
            break;

          case 'TRIGGER_SOS':
            // Alerts should be visible to CAREGIVER and FAMILY dashboards
            if (view === undefined) break;
            if (view === 'CAREGIVER' || view === 'FAMILY') applyAction(action);
            break;

          case 'ADD_REMINDER':
          case 'DELETE_REMINDER':
          case 'MARK_REMINDER_NOTIFIED':
          case 'COMPLETE_REMINDER':
            // Reminder state is shared across all dashboards
            applyAction(action);
            break;

          case 'ADD_VOICE_MESSAGE': {
            // route voice messages based on senderRole
            const senderRole = action?.payload?.senderRole;
            if (!senderRole) break;
            if (senderRole === 'FAMILY' || senderRole === 'CAREGIVER') {
              // family/caregiver messages -> only patient's dashboard
              if (view === 'PATIENT') applyAction(action);
            } else if (senderRole === 'PATIENT') {
              // patient's messages -> caregiver and family dashboards
              if (view === 'CAREGIVER' || view === 'FAMILY') applyAction(action);
            }
            break;
          }

          case 'ADD_MEMORY':
          case 'ADD_QUOTE':
            // Memories and comforting thoughts from family -> patient only
            if (view === 'PATIENT') applyAction(action);
            break;

          default:
            // Fallback: apply other actions everywhere
            applyAction(action);
        }
      } catch (e) {
        console.warn('Error applying remote action', e);
      }
    });

    // If a global demo realtime URL is present at mount, connect now.
    const wsUrl = (window as any).__DEMO_REALTIME_URL as string | undefined;
    if (wsUrl) {
      realtimeService.connect(wsUrl);
    }

    return () => {
      // Clean up subscription and disconnect the service
      try { unsubscribe(); } catch (e) { /* ignore */ }
      realtimeService.disconnect();
    };
  }, []);

  // Wrap dispatch to optionally forward actions to the realtime server when enabled
  const wrappedDispatch: React.Dispatch<AppActionAll> = (action) => {
    // Ensure voice messages include senderRole so routing rules work reliably
    let actToDispatch = action as any;
    if (action.type === 'ADD_VOICE_MESSAGE') {
      try {
        const payload = (action as any).payload || {};
        if (!payload.senderRole) {
          // Prefer explicit currentUser.role, otherwise derive from currentView
          const explicitRole = (state as any).currentUser?.role;
          const view = (state as any).currentView;
          let derivedRole = explicitRole;
          if (!derivedRole && view) {
            derivedRole = view; // ViewMode values match SenderRole strings
          }
          if (!derivedRole) derivedRole = 'FAMILY';
          const newPayload = { ...payload, senderRole: derivedRole };
          actToDispatch = { ...action, payload: newPayload };
        }
      } catch (e) {
        console.warn('Failed to derive senderRole for voice message', e);
      }
    }

    // Forward to realtime server if configured
    const wsUrl = (window as any).__DEMO_REALTIME_URL as string | undefined;
    if (wsUrl && realtimeService) {
      try {
        // Only forward actions that represent shared domain events
        const doNotForward = new Set(['SET_VIEW_MODE', 'LOGIN_SUCCESS', 'SET_DEV_MODE']);
        if (!doNotForward.has(actToDispatch.type)) {
          // Add a small remote id to help dedupe
          const actionToSend = { ...actToDispatch, _remoteId: (actToDispatch as any)._remoteId || `r-${Date.now()}-${Math.random().toString(36).slice(2,8)}` };
          realtimeService.sendAction(actionToSend);
        }
      } catch (e) {
        console.warn('Failed to send action to realtime server', e);
      }
    }

    // Apply locally
    dispatch(actToDispatch as any);
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