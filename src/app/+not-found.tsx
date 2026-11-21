import { Redirect } from 'expo-router';

// SplitSnap is a single-screen flow: any unknown URL goes back to the start.
export default function NotFound() {
  return <Redirect href="/" />;
}
