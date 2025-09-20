import { useState, useEffect, useCallback, useRef } from 'react';

type PermissionState = 'prompt' | 'granted' | 'denied';

interface DeviceSensors {
  heading: number | null;
  linearAcceleration: { x: number; y: number; z: number; } | null;
  permissionState: PermissionState;
  requestPermissions: () => Promise<boolean>;
}

// Helper to check if we are on iOS 13+
const isIOS13OrNewer = () => {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) {
    const osVersion = ua.match(/OS (\d+)_/);
    if (osVersion && osVersion[1] && parseInt(osVersion[1], 10) >= 13) {
      return true;
    }
  }
  return false;
};

// --- Smoothing logic ---
const HEADING_SMOOTHING_BUFFER_SIZE = 10;
const headingBuffer: number[] = [];

const getSmoothedHeading = (newHeading: number): number => {
    // Handle the 360 -> 0 degree wrap-around by using sine and cosine components
    if (headingBuffer.length > 0) {
        const lastAvg = headingBuffer.reduce((sum, val) => sum + val, 0) / headingBuffer.length;
        // If the new value jumps more than 180 degrees, it's likely a wrap-around, reset buffer
        if (Math.abs(newHeading - lastAvg) > 180) {
            headingBuffer.length = 0; // Clear the buffer
        }
    }

    headingBuffer.push(newHeading);
    if (headingBuffer.length > HEADING_SMOOTHING_BUFFER_SIZE) {
        headingBuffer.shift();
    }

    // Calculate the average of the angles
    let sumX = 0;
    let sumY = 0;
    for (const angle of headingBuffer) {
        sumX += Math.cos(angle * Math.PI / 180);
        sumY += Math.sin(angle * Math.PI / 180);
    }
    const avgX = sumX / headingBuffer.length;
    const avgY = sumY / headingBuffer.length;

    const avgAngleRad = Math.atan2(avgY, avgX);
    let avgAngleDeg = avgAngleRad * 180 / Math.PI;

    if (avgAngleDeg < 0) {
        avgAngleDeg += 360;
    }

    return avgAngleDeg;
};


export const useDeviceSensors = (): DeviceSensors => {
  const [heading, setHeading] = useState<number | null>(null);
  const [linearAcceleration, setLinearAcceleration] = useState<{ x: number; y: number; z: number } | null>(null);
  const [permissionState, setPermissionState] = useState<PermissionState>('prompt');
  
  const gravityRef = useRef([0, 0, 0]);

  const handleOrientation = (event: DeviceOrientationEvent) => {
    if (event.alpha !== null) {
      // For webkit browsers (iOS), event.webkitCompassHeading is more reliable
      const compassHeading = (event as any).webkitCompassHeading || event.alpha;
      setHeading(getSmoothedHeading(360 - compassHeading)); // Invert to get North=0
    }
  };

  const handleMotion = (event: DeviceMotionEvent) => {
    // Prefer the browser's native linear acceleration if available
    if (event.acceleration && event.acceleration.x !== null) {
      const { x, y, z } = event.acceleration;
      if (x !== null && y !== null && z !== null) {
        setLinearAcceleration({ x, y, z });
      }
    } 
    // Otherwise, calculate it from accelerationIncludingGravity
    else if (event.accelerationIncludingGravity && event.accelerationIncludingGravity.x !== null) {
      const acc = event.accelerationIncludingGravity;
      const alpha = 0.8; // Low-pass filter alpha. Higher value = more smoothing.

      // Isolate gravity with a low-pass filter
      gravityRef.current[0] = alpha * gravityRef.current[0] + (1 - alpha) * (acc.x || 0);
      gravityRef.current[1] = alpha * gravityRef.current[1] + (1 - alpha) * (acc.y || 0);
      gravityRef.current[2] = alpha * gravityRef.current[2] + (1 - alpha) * (acc.z || 0);

      // Subtract gravity to get linear acceleration
      const linear = {
        x: (acc.x || 0) - gravityRef.current[0],
        y: (acc.y || 0) - gravityRef.current[1],
        z: (acc.z || 0) - gravityRef.current[2],
      };
      setLinearAcceleration(linear);
    }
  };

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    if (!isIOS13OrNewer() || typeof (DeviceOrientationEvent as any).requestPermission !== 'function') {
      // For Android and non-iOS 13+ devices, permissions are often granted by default or via browser settings
      setPermissionState('granted');
      return true;
    }

    try {
      const orientationPermission = await (DeviceOrientationEvent as any).requestPermission();
      const motionPermission = await (DeviceMotionEvent as any).requestPermission();
      
      if (orientationPermission === 'granted' && motionPermission === 'granted') {
        setPermissionState('granted');
        return true;
      } else {
        setPermissionState('denied');
        return false;
      }
    } catch (error) {
      console.error("Error requesting sensor permissions:", error);
      setPermissionState('denied');
      return false;
    }
  }, []);

  useEffect(() => {
    if (permissionState === 'granted') {
      window.addEventListener('deviceorientation', handleOrientation);
      window.addEventListener('devicemotion', handleMotion);
    }
    
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      window.removeEventListener('devicemotion', handleMotion);
    };
  }, [permissionState]);

  return { heading, linearAcceleration, permissionState, requestPermissions };
};