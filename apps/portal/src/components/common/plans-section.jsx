import { isCookiesDisabled } from '../../utils/helpers';
import ProductsSection, { ChangeProductSection } from './products-section';

export function MultipleProductsPlansSection({
  products,
  selectedPlan,
  onPlanSelect,
  onPlanCheckout,
  changePlan = false,
}) {
  const cookiesDisabled = isCookiesDisabled();
  /**Don't allow plans selection if cookies are disabled */
  if (cookiesDisabled) {
    onPlanSelect = () => {};
  }

  if (changePlan) {
    return (
      <section>
        <div>
          <ChangeProductSection
            type="changePlan"
            products={products}
            selectedPlan={selectedPlan}
            onPlanSelect={onPlanSelect}
          />
        </div>
      </section>
    );
  }

  return (
    <section>
      <div>
        <ProductsSection
          type="upgrade"
          products={products}
          onPlanSelect={onPlanSelect}
          handleChooseSignup={(...args) => {
            onPlanCheckout(...args);
          }}
        />
      </div>
    </section>
  );
}
