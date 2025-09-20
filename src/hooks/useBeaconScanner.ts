import { useState, useEffect, useCallback, useRef } from 'react';
import { Beacon } from '../types';

// Web Bluetooth API is experimental, so types might not be in standard lib.
declare global {
    interface Bluetooth {
        requestLEScan(options?: any): Promise<any>;
    }
    interface Navigator {
        bluetooth: Bluetooth;
    }
}

// --- Configuration ---
const TX_POWER = -59; // Calibrated RSSI at 1 meter. This value is typical for many beacons.
const ENVIRONMENTAL_FACTOR = 2.0; // How quickly signal fades. 2.0 is for free space.

/**
 * Estimates distance from a beacon based on its RSSI.
 * @param rssi - The received signal strength indicator.
 * @returns The estimated distance in meters.
 */
const estimateDistance = (rssi: number): number => {
    if (rssi === 0) {
        return -1.0; // Cannot determine distance
    }
    const ratio = rssi * 1.0 / TX_POWER;
    if (ratio < 1.0) {
        return Math.pow(ratio, 10);
    } else {
        const distance = Math.pow(10, (TX_POWER - rssi) / (10 * ENVIRONMENTAL_FACTOR));
        return distance;
    }
};

export const useBeaconScanner = () => {
    const [beacons, setBeacons] = useState<Beacon[]>([]);
    const [isScanning, setIsScanning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const scanControllerRef = useRef<any>(null);

    const handleAdvertisement = (event: any) => {
        const { device, rssi } = event;
        const name = device.name || null;
        const id = device.id;

        // In a real app, you might parse `event.manufacturerData` for iBeacon/Eddystone formats.
        // For this demo, we'll just use the device name and ID.

        setBeacons(prevBeacons => {
            const existingBeaconIndex = prevBeacons.findIndex(b => b.id === id);
            const newBeacon: Beacon = {
                id,
                name,
                rssi,
                distance: estimateDistance(rssi),
            };

            let updatedBeacons;
            if (existingBeaconIndex > -1) {
                // Update existing beacon info
                updatedBeacons = [...prevBeacons];
                updatedBeacons[existingBeaconIndex] = newBeacon;
            } else {
                // Add new beacon
                updatedBeacons = [...prevBeacons, newBeacon];
            }

            // Sort by distance (closest first)
            return updatedBeacons.sort((a, b) => a.distance - b.distance);
        });
    };

    const startScan = useCallback(async () => {
        if (!navigator.bluetooth) {
            setError("Web Bluetooth API is not available on this browser.");
            console.error("Web Bluetooth API is not available.");
            return;
        }

        if (isScanning) return;

        try {
            console.log("Requesting Bluetooth LE Scan...");
            setIsScanning(true);
            setError(null);
            
            // This is the user gesture-triggered permission prompt
            const scan = await navigator.bluetooth.requestLEScan({ acceptAllAdvertisements: true });
            scanControllerRef.current = scan;
            
            console.log("Scan started. Listening for advertisements...");
            (navigator.bluetooth as any).addEventListener('advertisementreceived', handleAdvertisement);

        } catch (err) {
            console.error("Error starting BLE scan:", err);
            if (err instanceof DOMException && err.name === 'NotAllowedError') {
                setError("Bluetooth permission was denied.");
            } else {
                setError("Could not start beacon scanning.");
            }
            setIsScanning(false);
        }
    }, [isScanning]);
    
    const stopScan = useCallback(() => {
        if (scanControllerRef.current) {
            scanControllerRef.current.stop();
            scanControllerRef.current = null;
            console.log("BLE scan stopped.");
        }
        setIsScanning(false);
        if (navigator.bluetooth) {
            (navigator.bluetooth as any).removeEventListener('advertisementreceived', handleAdvertisement);
        }
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopScan();
        };
    }, [stopScan]);

    return { beacons, isScanning, error, startScan, stopScan };
};