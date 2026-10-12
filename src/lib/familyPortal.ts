import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { initializeFirestore, getDoc, doc, setDoc, collection } from 'firebase/firestore';
import config from '../../firebase-applet-config.json';

// A separate session keeps family sign-in independent of the teacher workspace.
const app = getApps().find(a => a.name === 'family-portal') || initializeApp(config, 'family-portal');
export const familyAuth = getAuth(app);
export const familyDb = initializeFirestore(app, { ignoreUndefinedProperties: true }, config.firestoreDatabaseId);
export const signInFamily = () => signInWithPopup(familyAuth, new GoogleAuthProvider());
export const signOutFamily = () => signOut(familyAuth);
export const readFamilyReport = (id: string) => getDoc(doc(familyDb, 'familyReports', id));
export async function requestCorrection(report: FamilyReport, logId: string, reason: string, requestedDescription: string) {
  if (!familyAuth.currentUser) throw new Error('Vui lòng đăng nhập.');
  await setDoc(doc(collection(familyDb, 'correctionRequests')), {
    reportId: report.id, teacherId: report.teacherId, classId: report.classId, studentId: report.studentId,
    logId, requesterId: familyAuth.currentUser.uid, requesterEmail: familyAuth.currentUser.email,
    reason: reason.trim(), requestedDescription: requestedDescription.trim(), status: 'pending', createdAt: new Date().toISOString(),
  });
}
export interface FamilyReport {
  id: string; teacherId: string; classId: string; studentId: string; studentName: string; className: string;
  viewerEmail: string; expiresAt: any; revoked: boolean; publishedAt: string;
  logIds: string[];
  logs: { id: string; date: string; behaviorDescription: string; type: string; totalScore: number }[];
  weeks: { weekNumber: number; finalScore: number; rank: string; explanation: string }[];
  months: { month: number; finalScore: number; rank: string; explanation: string }[];
}
