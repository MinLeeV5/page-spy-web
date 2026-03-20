export const ROOM_ENV_OPTIONS = ['dev', 'test', 'uat', 'prod'] as const;

const ROOM_ENV_SET = new Set<string>(ROOM_ENV_OPTIONS);

export interface RoomGroup<T extends I.SpyRoom = I.SpyRoom> {
  key: string;
  unique: string;
  hasUnique: boolean;
  rooms: T[];
  liveCount: number;
  primaryRoom: T;
}

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

export const getRoomTitle = (room: I.SpyRoom) => {
  return String(room.tags?.title ?? '').trim();
};

export const getRoomDisplayTitle = (room: I.SpyRoom) => {
  return getRoomTitle(room) || safeDecodeURI(room.group) || '--';
};

export const getRoomUnique = (room: I.SpyRoom) => {
  return String(room.tags?.unique ?? '').trim();
};

export const getRoomUniqueDisplay = (room: I.SpyRoom) => {
  return safeDecodeURI(getRoomUnique(room));
};

export const getRoomUrl = (room: I.SpyRoom) => {
  return String(room.tags?.url ?? '').trim();
};

export const getRoomUrlDisplay = (room: I.SpyRoom) => {
  const url = getRoomUrl(room);
  if (!url) return '';

  try {
    const { host, pathname } = new URL(url);
    return `${host}${pathname === '/' ? '' : pathname}` || url;
  } catch {
    return url;
  }
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

export const hasRoomClient = (room: I.SpyRoom) => {
  return room.connections.some(({ userId }) => userId === 'Client');
};

export const groupRoomsByUnique = <T extends I.SpyRoom>(rooms: T[]) => {
  const groupMap = new Map<string, RoomGroup<T>>();

  rooms.forEach((room) => {
    const unique = getRoomUniqueDisplay(room);
    const hasUnique = Boolean(unique);
    const key = hasUnique ? `unique:${unique}` : `address:${room.address}`;
    const current =
      groupMap.get(key) ??
      ({
        key,
        unique,
        hasUnique,
        rooms: [],
        liveCount: 0,
        primaryRoom: room,
      } satisfies RoomGroup<T>);

    current.rooms.push(room);
    if (hasRoomClient(room)) {
      current.liveCount += 1;
    }

    groupMap.set(key, current);
  });

  return Array.from(groupMap.values());
};

export const matchesRoomKeyword = (room: I.SpyRoom, keyword: string) => {
  const normalizedKeyword = normalizeSearchValue(keyword);
  if (!normalizedKeyword) return true;

  const fields = [
    getRoomUnique(room),
    getRoomUniqueDisplay(room),
    getRoomTitle(room),
    getRoomDisplayTitle(room),
    getRoomUrl(room),
    getRoomUrlDisplay(room),
    safeDecodeURI(room.group),
    room.address,
    getShortAddress(room.address),
  ];

  return fields.some((field) => {
    return normalizeSearchValue(field).includes(normalizedKeyword);
  });
};
