export const ROOM_ENV_OPTIONS = ['dev', 'test', 'uat', 'prod'] as const;

const ROOM_ENV_SET = new Set<string>(ROOM_ENV_OPTIONS);

export const safeDecodeURI = (value: string = '') => {
  if (!value) return '';
  try {
    return decodeURI(value);
  } catch {
    return value;
  }
};

export const normalizeSearchValue = (value: unknown) => {
  return String(value ?? '')
    .trim()
    .toLowerCase();
};

export const getShortAddress = (address: string = '') => {
  return address.slice(0, 4);
};

export const normalizeRoomEnv = (value: unknown): I.RoomEnv | '' => {
  const normalized = normalizeSearchValue(value);
  if (ROOM_ENV_SET.has(normalized)) {
    return normalized as I.RoomEnv;
  }
  return '';
};

export const getRoomEnv = (room: I.SpyRoom) => {
  return normalizeRoomEnv(room.tags?.env);
};

export const getRoomVersion = (room: I.SpyRoom) => {
  return String(room.tags?.version ?? '').trim();
};

export const matchesRoomKeyword = (room: I.SpyRoom, keyword: string) => {
  const normalizedKeyword = normalizeSearchValue(keyword);
  if (!normalizedKeyword) return true;

  const fields = [
    room.tags?.title,
    safeDecodeURI(room.group),
    room.address,
    getShortAddress(room.address),
  ];

  return fields.some((field) => {
    return normalizeSearchValue(field).includes(normalizedKeyword);
  });
};
