import { Outlet } from 'react-router-dom';
import { RequireProfile } from '../components/RequireProfile';
import { ChatWidget } from '../features/chat/ChatWidget';

/**
 * Layout route for every signed-in page with a profile. React Router keeps this
 * element mounted and swaps only the Outlet, so ChatWidget survives navigation
 * and keeps its conversation. Wrapping each page in its own RequireProfile
 * instead -- how these routes used to be declared -- would remount the widget
 * on every navigation and drop the history.
 */
export function AuthenticatedLayout() {
  return (
    <RequireProfile>
      <Outlet />
      <ChatWidget />
    </RequireProfile>
  );
}
