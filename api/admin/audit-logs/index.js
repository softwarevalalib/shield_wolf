import { requirePermission } from '../../../server/middleware/auth.js';
import { createAdminStubHandler } from '../../../server/utils/adminStub.js';

export default createAdminStubHandler({
  resource: 'audit-logs',
  requireAuthFn: requirePermission('audit.view'),
});
