import { MouseEvent, TouchEvent } from 'react';

export interface Reminder {
  id: string;
  title: string;
  time: string;
  completed: boolean;
  icon: 'medication' | 'meal' | 'hydration' | 'music';
  notified: boolean;
}

export interface Alert {
  id: string;
  message: string;
  timestamp: string;
  type: 'SOS' | 'FALL' | 'EMOTION';
  requiresAcknowledgement?: boolean;
}

export interface Memory {
    id: string;
    imageUrl: string;
    caption: string;
    sharedBy: string; // e.g., "Your Daughter, Jane"
}

export interface EventLogItem {
    id: string;
    text: string;
    timestamp: string;
    icon: 'reminder' | 'sos' | 'task' | 'memory' | 'fall' | 'emotion';
}

export interface SharedQuote {
    id: string;
    text: string;
    timestamp: string;
}

export enum ViewMode {
  PATIENT = 'PATIENT',
  CAREGIVER = 'CAREGIVER',
  FAMILY = 'FAMILY',
}

export enum SenderRole {
  PATIENT = 'PATIENT',
  CAREGIVER = 'CAREGIVER',
  FAMILY = 'FAMILY',
}

export interface VoiceMessage {
  id: string;
  audioUrl: string;
  duration: number; // in seconds
  senderRole: SenderRole;
  senderName: string;
  timestamp: string;
}

export interface CurrentUser {
  username: string;
  role?: 'PATIENT' | 'FAMILY' | 'CAREGIVER' | string;
}

export enum PatientScreen {
    HOME = 'HOME',
    NAVIGATION = 'NAVIGATION',
    REMINDERS = 'REMINDERS',
    AI_COMPANION = 'AI_COMPANION',
    COGNITIVE_GAMES = 'COGNITIVE_GAMES',
    MEMORY_ALBUM = 'MEMORY_ALBUM',
    VOICE_MESSAGES = 'VOICE_MESSAGES',
    MUSIC_THERAPY = 'MUSIC_THERAPY',
}

export interface Beacon {
  id: string;
  name: string | null;
  rssi: number;
  distance: number;
}

export type AppAction =
  | { type: 'COMPLETE_REMINDER'; payload: string }
  | { type: 'ADD_REMINDER'; payload: Reminder }
  | { type: 'DELETE_REMINDER'; payload: string }
  | { type: 'TRIGGER_SOS'; payload: Alert }
  | { type: 'ADD_MEMORY'; payload: Memory }
  | { type: 'ADD_QUOTE'; payload: SharedQuote }
  | { type: 'LOG_EMOTION'; payload: { emotion: string } }
  | { type: 'ADD_VOICE_MESSAGE'; payload: VoiceMessage }
  | { type: 'UPDATE_VOICE_MESSAGE_DURATION'; payload: { id: string; duration: number } }
  | { type: 'ACKNOWLEDGE_ALERTS' }
  | { type: 'MARK_REMINDER_NOTIFIED'; payload: string };

// UI actions
export type UIAction =
  | { type: 'SET_VIEW_MODE'; payload: ViewMode };

// Auth and UI actions
export type AuthAction =
  | { type: 'LOGIN_SUCCESS'; payload: CurrentUser }
  | { type: 'LOGOUT' }
  | { type: 'SET_DEV_MODE'; payload: boolean };

// Extend AppAction to allow unioning with AuthAction where needed
// Include UIAction (e.g., SET_VIEW_MODE) in the full action union used across the app
export type AppActionAll = AppAction | AuthAction | UIAction;
