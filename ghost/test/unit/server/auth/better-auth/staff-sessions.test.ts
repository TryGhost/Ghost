import assert from 'node:assert/strict';
import {
  createStaffSessions,
  type StaffSessionsDeps,
} from '../../../../../core/server/auth/better-auth/staff-sessions';

describe('createStaffSessions', function () {
  describe('revokeUserSessions', function () {
    const revocationFailed = new Error('Revocation failed.');

    function staffSessions({ legacyFails = false } = {}) {
      const deletedFor: string[] = [];
      const sessions = createStaffSessions({
        getAuth: () =>
          ({
            revokeUserSessions: async () => {
              throw revocationFailed;
            },
          }) as unknown as ReturnType<StaffSessionsDeps['getAuth']>,
        deleteLegacyUserSessions: async (userId) => {
          if (legacyFails) {
            throw new Error('Legacy deletion failed.');
          }
          deletedFor.push(userId);
        },
        getAdminOrigin: () => 'https://admin.example',
      });
      return { sessions, deletedFor };
    }

    it("deletes the user's legacy sessions even when Better Auth's revocation fails", async function () {
      const { sessions, deletedFor } = staffSessions();

      await assert.rejects(
        sessions.revokeUserSessions('user-1'),
        (thrown) => thrown === revocationFailed,
      );
      assert.deepEqual(deletedFor, ['user-1']);
    });

    it("reports the revocation's failure when the legacy deletion fails too", async function () {
      const { sessions } = staffSessions({ legacyFails: true });

      await assert.rejects(
        sessions.revokeUserSessions('user-1'),
        (thrown) => thrown === revocationFailed,
      );
    });
  });
});
