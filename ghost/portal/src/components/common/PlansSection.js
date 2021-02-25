import React from 'react';
import {isCookiesDisabled} from '../../utils/helpers';

export const PlanSectionStyles = `
    .gh-portal-plans-container {
        display: flex;
        align-items: stretch;
        border: 1px solid var(--grey10);
        border-radius: 5px;
    }

    .gh-portal-plan-section {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        flex: 1;
        font-size: 1.4rem;
        line-height: 1.35em;
        border-right: 1px solid var(--grey10);
        padding: 16px 10px;
        cursor: pointer;
        user-select: none;
    }

    .gh-portal-plans-container.disabled .gh-portal-plan-section {
        cursor: auto;
    }

    .gh-portal-plan-section.checked::before {
        position: absolute;
        display: block;
        top: -1px;
        right: -1px;
        bottom: -1px;
        left: -1px;
        content: "";
        z-index: 999;
        border: 2px solid var(--brandcolor);
        pointer-events: none;
    }

    .gh-portal-plan-section:first-of-type::before {
        border-top-left-radius: 5px;
        border-bottom-left-radius: 5px;
    }

    .gh-portal-plan-section:last-of-type::before {
        border-top-right-radius: 5px;
        border-bottom-right-radius: 5px;
    }

    .gh-portal-plan-section:last-of-type {
        border-right: none;
    }

    .gh-portal-plans-container.disabled .gh-portal-plan-section.checked::before {
        opacity: 0.3;
    }

    .gh-portal-plan-pricelabel {
        display: flex;
        margin-top: 8px;
    }

    .gh-portal-plan-name {
        font-size: 1.2rem;
        font-weight: 500;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        margin-top: 8px;
    }

    .gh-portal-plan-currency {
        position: relative;
        bottom: 2px;
        font-size: 1.4rem;
        font-weight: 500;
        letter-spacing: 0.4px;
    }

    .gh-portal-plan-currency-code {
        bottom: -4px;
        order: 2;
        margin-left: 3px;
        font-size: 1.15rem;
    }

    .gh-portal-plan-price {
        font-size: 2.2rem;
        font-weight: 500;
        letter-spacing: 0.1px;
    }

    .gh-portal-plan-type {
        color: var(--grey7);
    }

    .gh-portal-plan-featurewrapper {
        display: flex;
        flex-direction: column;
        align-items: center;
        border-top: 1px solid var(--grey12);
        margin-top: 12px;
        padding-top: 12px;
        width: 100%;
    }

    .gh-portal-plan-feature {
        font-size: 1.25rem;
        font-weight: 500;
        line-height: 1.25em;
        text-align: center;
        letter-spacing: 0.2px;
    }

    .gh-portal-plan-checkbox {
        position: relative;
        display: block;
        font-size: 22px;
        height: 18px;
        cursor: pointer;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
    }

    .gh-portal-plans-container.disabled .gh-portal-plan-checkbox {
        cursor: auto;
    }

    .gh-portal-plan-checkbox input {
        position: absolute;
        height: 0;
        width: 0;
        opacity: 0;
        cursor: pointer;
    }

    .gh-portal-plan-checkbox .checkmark {
        position: absolute;
        top: 0;
        left: -9px;
        background-color: var(--grey12);
        border-radius: 999px;
        height: 18px;
        width: 18px;
    }

    .gh-portal-plan-checkbox input:checked ~ .checkmark {
        background-color: var(--brandcolor);
    }

    .gh-portal-plan-checkbox .checkmark::after {
        position: absolute;
        display: none;
        content: "";
    }

    .gh-portal-plan-checkbox input:checked ~ .checkmark:after {
        display: block;
    }

    .gh-portal-plan-checkbox .checkmark:after {
        left: 6.5px;
        top: 2.5px;
        width: 5px;
        height: 11px;
        border: solid var(--white);
        border-width: 0 2px 2px 0;
        -webkit-transform: rotate(45deg);
        -ms-transform: rotate(45deg);
        transform: rotate(45deg);
    }

    .gh-portal-plans-container.disabled .gh-portal-plan-checkbox input:checked ~ .checkmark {
        opacity: 0.3;
    }

    .gh-portal-content.signup.singleplan .gh-portal-plan-section {
        cursor: auto;
    }

    .gh-portal-content.signup.singleplan .gh-portal-plan-checkbox,
    .gh-portal-content.signup.singleplan .gh-portal-plan-section.checked::before {
        display: none;
    }

    .gh-portal-content.signup.singleplan .gh-portal-plan-name {
        margin-top: 0;
    }

    .gh-portal-plan-section:not(.checked)::before {
        position: absolute;
        display: block;
        top: -1px;
        right: -1px;
        bottom: -1px;
        left: -1px;
        content: "";
        z-index: 999;
        border: 1px solid var(--brandcolor);
        pointer-events: none;
        opacity: 0;
        transition: all 0.2s ease-in-out;
    }

    .gh-portal-plans-container.disabled .gh-portal-plan-section:not(.checked):hover::before {
        opacity: 0;
    }

    .gh-portal-plans-container.hide-checkbox .gh-portal-plan-checkbox {
        display: none;
    }

    .gh-portal-plans-container.hide-checkbox .gh-portal-plan-section {
        padding-top: 12px;
        padding-bottom: 20px;
    }

    .gh-portal-plan-current {
        display: block;
        font-size: 1.25rem;
        letter-spacing: 0.2px;
        line-height: 1.25em;
        color: var(--brandcolor);
        margin: 4px 0 -2px;
    }
`;

function Checkbox({name, onPlanSelect, isChecked, disabled}) {
    if (isCookiesDisabled()) {
        disabled = true;
    }
    return (
        <div className='gh-portal-plan-checkbox'>
            <input
                name={name}
                key={name}
                type="checkbox"
                checked={isChecked}
                aria-label={name}
                onChange={e => onPlanSelect(e, name)}
                disabled={disabled}
            />
            <span className='checkmark'></span>
        </div>
    );
}

function PriceLabel({currencySymbol, price}) {
    const isSymbol = currencySymbol.length !== 3;
    const currencyClass = isSymbol ? 'gh-portal-plan-currency gh-portal-plan-currency-symbol' : 'gh-portal-plan-currency gh-portal-plan-currency-code';
    return (
        <div className='gh-portal-plan-pricelabel'>
            <span className={currencyClass}>{currencySymbol}</span>
            <span className='gh-portal-plan-price'>{price}</span>
        </div>
    );
}

function PlanOptions({plans, selectedPlan, onPlanSelect, changePlan}) {
    const hasMonthlyPlan = plans.some(({name}) => {
        return name === 'Monthly';
    });
    return plans.map(({name, currency_symbol: currencySymbol, price, discount}, i) => {
        const isChecked = selectedPlan === name;
        const classes = (isChecked ? 'gh-portal-plan-section checked' : 'gh-portal-plan-section');
        const planDetails = {};
        let displayName = '';
        switch (name) {
        case 'Free':
            planDetails.feature = 'Free preview';
            break;
        case 'Monthly':
        case 'Complimentary':
            planDetails.feature = 'Full access';
            break;
        case 'Yearly':
            displayName = 'Annually';
            planDetails.feature = ((hasMonthlyPlan && discount > 0) ? (discount + '% discount') : 'Full access');
            break;

        default:
            break;
        }
        return (
            <div className={classes} key={name} onClick={e => onPlanSelect(e, name)}>
                <Checkbox name={name} isChecked={isChecked} onPlanSelect={onPlanSelect} />
                <h4 className='gh-portal-plan-name'>{displayName || name}</h4>
                <PriceLabel name={name} currencySymbol={currencySymbol} price={price} />
                <div className='gh-portal-plan-featurewrapper'>
                    <div className='gh-portal-plan-feature'>
                        {planDetails.feature}
                    </div>
                    {(changePlan && selectedPlan === name ? <span className='gh-portal-plan-current'>Current plan</span> : '')}
                </div>
            </div>
        );
    });
}

function PlanLabel({showLabel}) {
    if (!showLabel) {
        return null;
    }
    return (
        <label className='gh-portal-input-label'>Plan</label>
    );
}

function PlansSection({plans, showLabel = true, type, selectedPlan, onPlanSelect, changePlan = false, style}) {
    if (!plans || plans.length === 0 || (plans.length === 1 && plans[0].type === 'free')) {
        return null;
    }
    const cookiesDisabled = isCookiesDisabled();
    if (cookiesDisabled) {
        onPlanSelect = (e, name) => {};
    } 
    return (
        <section>
            <PlanLabel showLabel={showLabel} />
            <div className={'gh-portal-plans-container' + (changePlan ? ' hide-checkbox' : '') + (cookiesDisabled ? ' disabled' : '')}>
                <PlanOptions plans={plans} onPlanSelect={onPlanSelect} selectedPlan={selectedPlan} changePlan={changePlan} />
            </div>
        </section>
    );
}

export default PlansSection;
