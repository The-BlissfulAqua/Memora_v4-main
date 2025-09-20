import React, { useState, useEffect, useRef } from 'react';
import PatientView from './components/patient/PatientView';
import CaregiverView from './components/caregiver/CaregiverView';
import FamilyView from './components/family/FamilyView';
import { ViewMode } from './types';
import { useAppContext } from './context/AppContext';
import soundService from './services/soundService';
import localNotifications from './services/localNotifications';
import LoginPage from './components/shared/LoginPage';
import DashboardSelectorModal from './components/shared/DashboardSelectorModal';
import AcknowledgeModal from './components/shared/AcknowledgeModal';
import ReminderBanner from './components/shared/ReminderBanner';
// ReminderBanner removed per user's request: do not show upcoming reminders

const App: React.FC = () => {
  const { state, dispatch } = useAppContext();
  // Use global currentView from app state so login can control the dashboard
  const viewMode = state.currentView || ViewMode.PATIENT;
  // Keep a ref to the latest view so timers can check the current view when they fire
  const currentViewRef = useRef(viewMode);

  useEffect(() => {
    currentViewRef.current = state.currentView || ViewMode.PATIENT;
  }, [state.currentView]);

  const realtimeDotClass = (user: any) => {
    if (state.devMode) return 'bg-yellow-400';
    return user ? 'bg-green-400' : 'bg-red-500';
  };

  // Effect to unlock audio on the first user interaction
  useEffect(() => {
    const unlockAudioPlayback = () => {
      soundService.unlock();
      // This handler should only run once.
      document.removeEventListener('click', unlockAudioPlayback);
      document.removeEventListener('touchstart', unlockAudioPlayback);
    };

    document.addEventListener('click', unlockAudioPlayback);
    document.addEventListener('touchstart', unlockAudioPlayback);

    return () => {
      document.removeEventListener('click', unlockAudioPlayback);
      document.removeEventListener('touchstart', unlockAudioPlayback);
    };
  }, []);

  // Expose a global helper so PatientHome can open the login modal without prop drilling
  // Expose a global helper so PatientHome can open the login modal without prop drilling
  // NOTE: this effect is defined after the `showLogin` state is declared further down to
  // avoid referencing the setter before it's initialized (which would cause a runtime crash).

  const [showDashboardSelector, setShowDashboardSelector] = useState(false);
  // Expose a global opener so login page can close and then open the selector (ensures selector is on top)
  useEffect(() => {
    (window as any).openDashboardSelector = () => setShowDashboardSelector(true);
    return () => { (window as any).openDashboardSelector = undefined; };
  }, []);

  // Centralized alert sound control: only play alerts for caregiver/family or when in devMode.
  useEffect(() => {
    const unack = state.alerts.filter(a => (a.type === 'SOS' || a.type === 'FALL') && a.requiresAcknowledgement);
    // Determine effective role used for alert audio. Make the master-switch (`state.currentView`)
    // authoritative for whether alerts should play. Only fall back to the logged-in user's role
    // when the view is the default PATIENT view. This ensures switching the dashboard via the
    // master switch immediately updates audio behaviour.
  // Use the currently selected dashboard view as the authoritative role for alert audio.
  // This ensures switching the dashboard to PATIENT immediately silences caregiver/family alerts.
  const loggedRole = state.currentUser?.role?.toUpperCase?.();
  const viewRole = state.currentView === 'CAREGIVER' ? 'CAREGIVER' : state.currentView === 'FAMILY' ? 'FAMILY' : 'PATIENT';
  const effectiveRole = viewRole; // view is authoritative
  const canHear = effectiveRole === 'CAREGIVER' || effectiveRole === 'FAMILY';
  console.debug('[App] alert-effect', { effectiveRole, viewRole, loggedRole, canHear, devMode: state.devMode, unackCount: unack.length, alerts: unack.map(a => ({ id: a.id, type: a.type })) });

    if (!canHear) {
      soundService.stopSosAlert();
      soundService.stopFallAlert();
      return;
    }

    if (unack.length > 0) {
      if (unack.some(a => a.type === 'SOS')) {
        soundService.stopFallAlert();
        soundService.playSosAlert();
      } else if (unack.some(a => a.type === 'FALL')) {
        soundService.stopSosAlert();
        soundService.playFallAlert();
      }
    } else {
      soundService.stopSosAlert();
      soundService.stopFallAlert();
    }

    return () => {
      soundService.stopSosAlert();
      soundService.stopFallAlert();
    };
  }, [state.alerts, state.currentUser, state.devMode, state.currentView]);

  // Request native permissions (microphone/camera) when a user logs in on native platforms
  useEffect(() => {
    const tryRequestNativePermissions = async () => {
      try {
        const Cap = (window as any).Capacitor;
        if (Cap && typeof Cap.isNativePlatform === 'function' && Cap.isNativePlatform()) {
          // dynamic import to avoid bundler issues on web
          const core = await import('@capacitor/core');
          const coreAny: any = core;
          try {
            if (coreAny.Permissions && typeof coreAny.Permissions.request === 'function') {
              await coreAny.Permissions.request({ name: 'camera' as any });
            }
          } catch (e) {
            console.warn('Camera permission request failed', e);
          }
          try {
            if (coreAny.Permissions && typeof coreAny.Permissions.request === 'function') {
              await coreAny.Permissions.request({ name: 'microphone' as any });
            }
          } catch (e) {
            console.warn('Microphone permission request failed', e);
          }
        }
      } catch (e) {
        // Not a native environment or permissions plugin missing — ignore.
        // On web, components already request permissions when needed.
      }
    };

    if (state.currentUser) {
      // Request permissions for camera/microphone (existing) and additional
      // best-effort requests for bluetooth, motion/activity, and notifications.
      tryRequestNativePermissions();
      // Request notification permission (web) and Local Notifications on native
      (async () => {
        try {
          await localNotifications.requestPermission();
        } catch (e) {
          console.warn('Notification permission request failed', e);
        }
      })();
    }
  }, [state.currentUser]);

  // Global handler for native notification actions (registered by localNotifications)
  useEffect(() => {
    (window as any).__ON_NOTIFICATION_ACTION = ({ actionId, data }: any) => {
      try {
        const reminderId = data?.reminderId;
        if (!reminderId) return;
        if (actionId === 'COMPLETE') {
          dispatch({ type: 'COMPLETE_REMINDER', payload: reminderId });
          dispatch({ type: 'MARK_REMINDER_NOTIFIED', payload: reminderId });
        } else if (actionId === 'SNOOZE') {
          // Add a new reminder 5 minutes from now, and mark this one notified
          const now = new Date();
          now.setMinutes(now.getMinutes() + 5);
          const hh = now.getHours().toString().padStart(2, '0');
          const mm = now.getMinutes().toString().padStart(2, '0');
          const newTime = `${hh}:${mm}`;
          dispatch({ type: 'ADD_REMINDER', payload: { id: new Date().toISOString(), title: data.title || 'Snoozed Reminder', time: newTime, notified: false, completed: false, icon: 'medication' } });
          dispatch({ type: 'MARK_REMINDER_NOTIFIED', payload: reminderId });
        } else if (actionId === 'DISMISS') {
          dispatch({ type: 'MARK_REMINDER_NOTIFIED', payload: reminderId });
        }
      } catch (e) {
        console.warn('Error handling notification action in app', e);
      }
    };
    return () => { (window as any).__ON_NOTIFICATION_ACTION = undefined; };
  }, [dispatch]);


  // Effect for checking reminders
  useEffect(() => {
    // Maintain a map of active timers so we can clear them on update/unmount
    const timers: Array<{ id: string; timerId: number }> = [];

    const scheduleForReminder = (reminder: any) => {
      if (reminder.completed || reminder.notified) return;
      try {
        const [hoursStr, minutesStr] = reminder.time.split(':');
        const now = new Date();
        const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), parseInt(hoursStr, 10), parseInt(minutesStr, 10), 0, 0);
        // If target is in the past for today, schedule for tomorrow
        if (target.getTime() <= Date.now()) {
          target.setDate(target.getDate() + 1);
        }
        const ms = target.getTime() - Date.now();
        console.debug('[App] scheduling reminder', { id: reminder.id, title: reminder.title, inMs: ms });
        const tid = window.setTimeout(async () => {
          try {
            console.log(`Reminder due (timer): ${reminder.title}`);
            // Mark notified in app state first to prevent re-scheduling
            dispatch({ type: 'MARK_REMINDER_NOTIFIED', payload: reminder.id });

            // Play audible alert regardless of current view
            const audioEl = soundService.playReminderAlert();

            // Only show a visible notification popup when the current view is PATIENT
            try {
              const isPatientView = (currentViewRef.current === ViewMode.PATIENT);
              if (isPatientView) {
                let webNotification: any = null;
                  // Ensure we have permission to show a web notification. Request if necessary.
                  try {
                    const perm = await localNotifications.requestPermission();
                    console.debug('[App] notification permission result', perm);
                    if (perm !== 'granted') {
                      console.warn('[App] notification permission not granted, skipping visible notification');
                    } else {
                      const res = await localNotifications.schedule({ id: Date.now(), title: reminder.title, body: reminder.title });
                      if (res && typeof (res as any).close === 'function') {
                        webNotification = res;
                      }
                    }
                  } catch (e) {
                    console.warn('Error requesting permission or scheduling notification', e);
                  }

                if (audioEl && webNotification) {
                  const onEnded = () => {
                    try { webNotification.close && webNotification.close(); } catch (e) { /* ignore */ }
                    audioEl.removeEventListener('ended', onEnded);
                  };
                  audioEl.addEventListener('ended', onEnded);
                  try { webNotification.onclick = () => { try { webNotification.close && webNotification.close(); } catch (e) { /* ignore */ } }; } catch (e) { /* ignore */ }
                }
              }
            } catch (e) {
              console.warn('Error showing notification (view gating)', e);
            }
          } catch (e) {
            console.error('Error in reminder timer handler', e);
          }
        }, ms);
        timers.push({ id: reminder.id, timerId: tid });
      } catch (e) {
        console.warn('Failed to schedule reminder', e);
      }
    };

    // Schedule timers for all reminders that are not completed/notified
    state.reminders.forEach(scheduleForReminder);

    return () => {
      timers.forEach(t => clearTimeout(t.timerId));
    };
  }, [state.reminders, dispatch]);

  // No banner logic: notifications and sounds should only occur at exact scheduled time


  const handleSwitchView = () => {
    let next = ViewMode.PATIENT;
    if (viewMode === ViewMode.PATIENT) next = ViewMode.CAREGIVER;
    else if (viewMode === ViewMode.CAREGIVER) next = ViewMode.FAMILY;
    else next = ViewMode.PATIENT;
    dispatch({ type: 'SET_VIEW_MODE', payload: next });
  };

  const getNextViewName = () => {
    if (viewMode === ViewMode.PATIENT) return 'Caregiver';
    if (viewMode === ViewMode.CAREGIVER) return 'Family';
    return 'Patient';
  };

  const renderView = () => {
    switch(viewMode) {
      case ViewMode.PATIENT:
        return <PatientView />;
      case ViewMode.CAREGIVER:
        return <CaregiverView />;
      case ViewMode.FAMILY:
        return <FamilyView />;
      default:
        return <PatientView />;
    }
  }

  // Master switch should only be visible in dev mode (explicitly enabled).
  const canShowMasterSwitch = !!state.devMode;

  const [showLogin, setShowLogin] = React.useState(false);
  const [showAckForAlertId, setShowAckForAlertId] = React.useState<string | null>(null);

  // Expose a global helper so PatientHome can open the login modal without prop drilling
  useEffect(() => {
    (window as any).openLoginModal = () => setShowLogin(true);
    return () => { (window as any).openLoginModal = undefined; };
  }, []);

  return (
    // The main background is now on the body tag in index.html
    <div className="min-h-screen font-sans antialiased text-gray-300"> 
      <div className="absolute top-4 right-4 z-50 flex items-center gap-3">
        {/* Connection status dot */}
        <div className={`w-3 h-3 rounded-full ${realtimeDotClass(state.currentUser)} ${state.devMode ? 'ring-2 ring-yellow-400' : ''}`} title={state.currentUser ? 'Connected' : 'Not connected'} />
        {/* Use the full LoginPage modal (opened via openLoginModal) for demo login UX */}
        {canShowMasterSwitch && (
          <button
            onClick={handleSwitchView}
            className="px-3 py-1 bg-slate-800/80 border border-slate-700 text-xs text-gray-300 rounded-full shadow-sm hover:bg-slate-700/90 transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-slate-500"
          >
            {getNextViewName()}
          </button>
        )}
      </div>
      {showLogin && <LoginPage onClose={() => setShowLogin(false)} />}

      {/* Show acknowledge modal for the first critical alert that requires acknowledgment */}
      {state.alerts.length > 0 && !showAckForAlertId && (() => {
  const role = state.currentUser?.role?.toUpperCase?.();
  // Acknowledge modal should only be visible to caregivers or family members.
  // Dev mode will NOT make the patient see the modal.
  const canSeeAck = role === 'CAREGIVER' || role === 'FAMILY';
        if (!canSeeAck) return null;
        const critical = state.alerts.find(a => (a.type === 'SOS' || a.type === 'FALL') && a.requiresAcknowledgement);
        if (critical) {
          setShowAckForAlertId(critical.id);
        }
        return null;
      })()}

      {showAckForAlertId && (() => {
        // Only show the acknowledge modal to caregiver or family dashboard views.
        const a = state.alerts.find(x => x.id === showAckForAlertId);
        if (!a) return null;
        const viewRole = state.currentView === 'CAREGIVER' ? 'CAREGIVER' : state.currentView === 'FAMILY' ? 'FAMILY' : 'PATIENT';
        if (viewRole === 'PATIENT') return null;
        return (
          <AcknowledgeModal
            alertId={a.id}
            alertType={a.type === 'FALL' ? 'FALL' : 'SOS'}
            onClose={() => setShowAckForAlertId(null)}
          />
        );
      })()}
      {/* No bannerReminder UI; notifications only fire at exact time */}
      {showDashboardSelector && (
        <div style={{ zIndex: 200000 }}>
          <DashboardSelectorModal onClose={() => setShowDashboardSelector(false)} />
        </div>
      )}
      {/* Show in-app persistent banner on Patient view when a reminder is due */}
      {viewMode === ViewMode.PATIENT && (() => {
        const due = state.reminders.find((r: any) => !r.completed && !r.notified && (() => {
          const now = new Date();
          const [h, m] = r.time.split(':');
          const reminderDate = new Date(now);
          reminderDate.setHours(Number(h), Number(m), 0, 0);
          return now >= reminderDate;
        })());
        if (due) {
          return <ReminderBanner reminder={due} status="due" />;
        }
        return null;
      })()}
      
      <div className="container mx-auto max-w-lg p-2 sm:p-4">
        {renderView()}
      </div>
    </div>
  );
};

export default App;