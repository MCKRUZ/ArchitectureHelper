/**
 * Hook to load official Azure service icons for Konva canvas rendering
 */

import { useState, useEffect } from 'react';
import type { AzureServiceType } from '@/lib/state/types';
import { getAzureIconPath } from './azureIconMapping';

interface IconImages {
  [key: string]: HTMLImageElement;
}

/**
 * Hook that loads and caches official Azure service icons as HTMLImageElement for Konva
 */
export function useKonvaIcons(serviceTypes: AzureServiceType[], size: number = 48): IconImages {
  const [iconImages, setIconImages] = useState<IconImages>({});

  useEffect(() => {
    const loadIcons = async () => {
      const images: IconImages = {};
      const loadPromises: Promise<void>[] = [];

      serviceTypes.forEach(serviceType => {
        const promise = new Promise<void>((resolve) => {
          const img = new Image(size, size);
          const iconPath = getAzureIconPath(serviceType);

          img.onload = () => {
            images[serviceType] = img;
            resolve();
          };

          img.onerror = () => {
            console.warn(`Failed to load official icon for ${serviceType} from ${iconPath}`);
            resolve();
          };

          img.src = iconPath;
        });

        loadPromises.push(promise);
      });

      await Promise.all(loadPromises);
      setIconImages(images);
    };

    if (serviceTypes.length > 0) {
      loadIcons();
    }
  }, [serviceTypes.join(','), size]); // Use join to avoid array reference changes

  return iconImages;
}

/**
 * Loads a single official Azure icon on demand
 */
export function loadKonvaIcon(
  serviceType: AzureServiceType,
  size: number = 48
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image(size, size);
    const iconPath = getAzureIconPath(serviceType);

    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load icon for ${serviceType} from ${iconPath}`));

    img.src = iconPath;
  });
}
