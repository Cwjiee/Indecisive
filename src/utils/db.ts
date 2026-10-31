import { db } from '../firebase';
import { doc, setDoc, getDoc, updateDoc, deleteDoc, arrayUnion, onSnapshot, collection, getDocs } from 'firebase/firestore';
import { type RoomData, type Participant, type BusyTimes, generateRoomCode } from './room';

/**
 * Creates a new room document in Firestore.
 * If preRoomCode is provided, it uses it. Otherwise, it generates a new one.
 */
export async function createRoomInDb(
  creatorName: string,
  dates: string[],
  preRoomCode: string | null,
  userInfo?: { userId?: string; userEmail?: string },
  busyTimes?: BusyTimes
): Promise<string> {
  const code = (preRoomCode || generateRoomCode()).toUpperCase();
  const roomRef = doc(db, 'rooms', code);

  const creatorParticipant: Participant = {
    name: creatorName,
    dates,
    ...(busyTimes && Object.keys(busyTimes).length > 0 && { busyTimes }),
    ...(userInfo?.userId && { userId: userInfo.userId }),
    ...(userInfo?.userEmail && { userEmail: userInfo.userEmail }),
  };

  const initialRoom: RoomData = {
    code,
    ...(userInfo?.userId && { creatorId: userInfo.userId }),
    participants: [creatorParticipant],
  };

  await setDoc(roomRef, {
    ...initialRoom,
    createdAt: new Date(),
  });

  return code;
}

/**
 * Adds a new participant's availability to an existing room in Firestore.
 */
export async function joinRoomInDb(
  roomCode: string,
  participantName: string,
  dates: string[],
  userInfo?: { userId?: string; userEmail?: string },
  busyTimes?: BusyTimes
): Promise<void> {
  const code = roomCode.toUpperCase();
  const roomRef = doc(db, 'rooms', code);
  const newParticipant: Participant = {
    name: participantName,
    dates,
    ...(busyTimes && Object.keys(busyTimes).length > 0 && { busyTimes }),
    ...(userInfo?.userId && { userId: userInfo.userId }),
    ...(userInfo?.userEmail && { userEmail: userInfo.userEmail }),
  };

  await updateDoc(roomRef, {
    participants: arrayUnion(newParticipant),
  });
}

/**
 * Fetches all rooms from Firestore where the user is a participant or creator.
 */
export async function getUserRoomsFromDb(userId: string): Promise<RoomData[]> {
  try {
    const roomsRef = collection(db, 'rooms');
    const snapshot = await getDocs(roomsRef);
    const rooms: RoomData[] = [];
    
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as RoomData;
      const isParticipant = data.participants?.some(
        (p) => p.userId === userId
      );
      const isCreator = data.creatorId === userId;
      if (isParticipant || isCreator) {
        rooms.push(data);
      }
    });

    return rooms;
  } catch (e) {
    console.error('Error fetching user rooms from Firestore:', e);
    return [];
  }
}

/**
 * Subscribes to real-time updates for a specific room.
 * Returns an unsubscribe function.
 */
export function subscribeToRoom(
  roomCode: string,
  onUpdate: (room: RoomData | null) => void,
  onError?: (err: Error) => void
) {
  const code = roomCode.toUpperCase();
  const roomRef = doc(db, 'rooms', code);

  return onSnapshot(
    roomRef,
    (snapshot) => {
      if (snapshot.exists()) {
        onUpdate(snapshot.data() as RoomData);
      } else {
        onUpdate(null);
      }
    },
    (error) => {
      console.error(`Error subscribing to room ${code}:`, error);
      if (onError) onError(error);
    }
  );
}

/**
 * Fetches a room document once without subscribing.
 */
export async function getRoomFromDb(roomCode: string): Promise<RoomData | null> {
  const code = roomCode.toUpperCase();
  const roomRef = doc(db, 'rooms', code);
  const snapshot = await getDoc(roomRef);
  if (snapshot.exists()) {
    return snapshot.data() as RoomData;
  }
  return null;
}

/**
 * Builds the database-backed share URL.
 */
export function buildDbShareUrl(roomCode: string): string {
  return `${window.location.origin}/room/${roomCode.toUpperCase()}`;
}

/**
 * Gets the list of saved room codes from localStorage.
 */
export function getSavedRooms(): string[] {
  const saved = localStorage.getItem('indecisive_my_rooms');
  if (saved) {
    try {
      return JSON.parse(saved) as string[];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Saves a room code to the history list in localStorage (keeps unique items, max 10).
 */
export function saveRoomToHistory(code: string): void {
  const codeUpper = code.toUpperCase();
  const rooms = getSavedRooms();
  const index = rooms.indexOf(codeUpper);
  if (index !== -1) {
    rooms.splice(index, 1); // remove from current position
  }
  rooms.unshift(codeUpper); // put at front
  localStorage.setItem('indecisive_my_rooms', JSON.stringify(rooms.slice(0, 10)));
}

/**
 * Updates the address bar with the active room code parameter without reloading.
 */
export function setUrlRoom(code: string): void {
  const url = new URL(window.location.href);
  url.searchParams.set('room', code.toUpperCase());
  window.history.pushState(null, '', url.toString());
}

/**
 * Overwrites the participants array of a room in Firestore.
 */
export async function updateRoomParticipantsInDb(
  roomCode: string,
  participants: Participant[]
): Promise<void> {
  const code = roomCode.toUpperCase();
  const roomRef = doc(db, 'rooms', code);
  await updateDoc(roomRef, { participants });
}/**
 * Sets or updates the final chosen date for a room in Firestore.
 */
export async function finalizeRoomDateInDb(
  roomCode: string,
  finalDate: string | null
): Promise<void> {
  const code = roomCode.toUpperCase();
  const roomRef = doc(db, 'rooms', code);
  await updateDoc(roomRef, { finalDate: finalDate || null });
}

/**
 * Deletes a room document from Firestore.
 */
export async function deleteRoomFromDb(roomCode: string): Promise<void> {
  const code = roomCode.toUpperCase();
  const roomRef = doc(db, 'rooms', code);
  await deleteDoc(roomRef);
}


