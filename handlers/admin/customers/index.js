import { requirePermission } from '../../../server/middleware/auth.js';
import { createAdminStubHandler } from '../../../server/utils/adminStub.js';

export default createAdminStubHandler({
  resource: 'customers',
  requireAuthFn: requirePermission('customers.view'),
});
