import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { ScanInput } from './scan';

/**
 * Pick or snap a photo, then shrink it before upload.
 * A 12-megapixel phone photo is ~4 MB; receipts read perfectly at ~1600px wide,
 * which is ~10x smaller → faster uploads and cheaper AI calls.
 */
export async function pickReceiptPhoto(source: 'camera' | 'library'): Promise<{ uri: string; input: ScanInput } | null> {
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted && perm.canAskAgain === false) {
      throw new Error('Camera permission is off. Enable it in Settings, or choose a photo instead.');
    }
  }
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1 };
  const result =
    source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  const longest = Math.max(asset.width || 0, asset.height || 0);
  const context = ImageManipulator.manipulate(asset.uri);
  if (longest > 1600) {
    if ((asset.width || 0) >= (asset.height || 0)) context.resize({ width: 1600, height: null });
    else context.resize({ height: 1600, width: null });
  }
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.8, base64: true });
  if (!saved.base64) throw new Error('Could not read that image.');
  const base64 = saved.base64.replace(/^data:image\/\w+;base64,/, '');
  return { uri: saved.uri, input: { base64, mediaType: 'image/jpeg' } };
}
