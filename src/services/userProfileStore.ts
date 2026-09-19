/**
 * User Profile Store — Clean, persistent citizen profile without fake demo defaults.
 */

export interface UserProfile {
  name: string;
  phone: string;
  email: string;
  dob: string; // YYYY-MM-DD or DD/MM/YYYY
  gender: string;
  address: string;
}

const STORAGE_KEY = 'coreserve_user_profile';

// Empty default profile — NEVER fake identity data
export const emptyUserProfile: UserProfile = {
  name: '',
  phone: '',
  email: '',
  dob: '',
  gender: '',
  address: ''
};

export function sanitizeDisplayName(rawName: string, email?: string): string {
  if (!rawName && email) {
    const userPart = email.split('@')[0];
    if (userPart.toLowerCase().startsWith('akshat')) return 'Akshat';
    const cleaned = userPart.replace(/[0-9._%+-]+$/g, '').trim();
    return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : '';
  }
  if (!rawName) return '';
  // Convert Akshat78790 or similar email-derived usernames to clean name
  if (/^akshat\d*$/i.test(rawName.trim())) {
    return 'Akshat';
  }
  // Strip trailing numbers if likely an email username
  const cleaned = rawName.replace(/([a-zA-Z]+)\d+$/g, '$1').trim();
  return cleaned || rawName.trim();
}

export function getUserProfile(): UserProfile {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      const cleanName = sanitizeDisplayName(parsed.name || '', parsed.email || '');
      return {
        ...emptyUserProfile,
        ...parsed,
        name: cleanName
      };
    }
  } catch (e) {
    console.warn('Error reading user profile from localStorage:', e);
  }
  return { ...emptyUserProfile };
}

export function setUserProfile(profile: Partial<UserProfile>): UserProfile {
  const current = getUserProfile();
  const rawName = profile.name !== undefined ? profile.name : current.name;
  const rawEmail = profile.email !== undefined ? profile.email : current.email;
  const cleanName = sanitizeDisplayName(rawName, rawEmail);

  const updated: UserProfile = {
    ...current,
    ...profile,
    name: cleanName
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('coreserve_profile_updated', { detail: updated }));
  } catch (e) {
    console.error('Error saving user profile to localStorage:', e);
  }
  return updated;
}

export function clearUserProfile(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('coreserve_profile_updated', { detail: emptyUserProfile }));
  } catch (e) {
    console.error('Error clearing user profile:', e);
  }
}
