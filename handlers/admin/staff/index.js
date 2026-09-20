import { requirePermission } from '../../../server/middleware/auth.js';
import { createAdminStubHandler } from '../../../server/utils/adminStub.js';

export default createAdminStubHandler({
  resource: 'staff',
  requireAuthFn: requirePermission('staff.manage'),
});
