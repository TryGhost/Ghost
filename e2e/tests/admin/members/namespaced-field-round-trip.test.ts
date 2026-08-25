import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { writeFileSync } from 'node:fs';

import { MembersImportModal, MembersListPage } from '@/admin-pages';
import { createMemberFactory } from '@/data-factory';
import { MySQLManager } from '@/helpers/environment/service-managers/mysql-manager';
import { expect, test } from '@/helpers/playwright';
import { usePerTestIsolation } from '@/helpers/playwright/isolation';

/**
 * A field Ghost declared, rather than one the publisher defined, across the surfaces that
 * offer a field: the import mapping targets and the members filter.
 *
 * The field is written as a row because that is the only way one exists — there is no API
 * to declare a field outside the publisher's namespace, and the publisher's own endpoint
 * refuses to touch it. Everything after that is the real UI.
 *
 * What this pins is that neither surface knows the publisher's namespace is special. A
 * namespace is addressed the same way everywhere — `shipping.address` is the CSV column,
 * the filter and the API property alike — so a namespace nothing in the front end has
 * heard of works as soon as a field is declared in it.
 */
usePerTestIsolation();

const SHIPPING = 'shipping';

test.describe('Ghost Admin - A field in another namespace', () => {
  test.use({ labs: { membersCustomFields: true, memberDetailsReact: true } });

  test('is offered as an import target, imported into, and filtered on', async ({
    page,
    ghostInstance,
  }) => {
    // Several surfaces in one journey: an import, a search, and a filter.
    test.slow();

    const ts = Date.now();
    const email = `ns-${ts}@ghost.org`;
    const name = `Namespaced ${ts}`;

    // Declared the way whatever owns a namespace declares one: as a row. A composite, so
    // the import has to offer a target per part rather than one for the whole field.
    const mysql = new MySQLManager();
    await mysql.declareMemberField(ghostInstance.database, {
      namespace: SHIPPING,
      key: 'address',
      name: 'Delivery address',
      type: 'address',
    });

    // Import lives in the Actions menu, which only exists once the list has a member;
    // on an empty list it is the empty-state link instead. This member is scenery.
    await createMemberFactory(page.request).create({
      name: `Existing ${ts}`,
      email: `ns-existing-${ts}@ghost.org`,
    });

    const membersPage = new MembersListPage(page);
    const importModal = new MembersImportModal(page);

    const csv = [
      'email,name,shipping.address.line1,shipping.address.city',
      `${email},${name},1 High Street,London`,
    ].join('\n');
    const csvPath = join(tmpdir(), `members-ns-${ts}.csv`);
    writeFileSync(csvPath, csv);

    await membersPage.goto();
    await membersPage.openImport();
    await importModal.fileInput.setInputFiles(csvPath);
    await expect(importModal.importButton).toBeVisible();

    // The part is what a column maps onto, so a composite Ghost declared has to offer its
    // parts by name exactly as a publisher composite does.
    await expect(importModal.getMappingValue('shipping.address.line1')).toContainText(
      'Delivery address',
    );
    await expect(importModal.getMappingValue('shipping.address.city')).toContainText(
      'Delivery address',
    );

    await importModal.importButton.click();
    await expect(importModal.importHeading).toBeVisible({ timeout: 15000 });
    await importModal.closeButton.click();

    await membersPage.goto();
    await membersPage.searchInput.fill(email);
    await expect(membersPage.getMemberByName(name)).toBeVisible({ timeout: 30000 });

    // The picker offers the field by name, and filtering on a part of it matches the
    // member the import created — the same journey a publisher field takes.
    await membersPage.goto();
    await membersPage.addCustomFieldFilter({
      field: 'Delivery address',
      subfield: 'City',
      // A composite defaults to whole-field "is set", which takes no value, so the
      // operator is named to get a value to match on.
      operator: 'is',
      value: 'London',
    });

    await expect(membersPage.getMemberByName(name)).toBeVisible({ timeout: 30000 });
    await expect(membersPage.getMemberByName(`Existing ${ts}`)).toHaveCount(0);

    // Matching on the part is the value having survived the whole way: mapped from a
    // column the import offered, stored under the namespace that declared the field, and
    // found again by naming that namespace and key.
  });
});
