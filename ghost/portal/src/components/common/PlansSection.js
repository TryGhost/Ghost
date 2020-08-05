import React from 'react';

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
        padding: 16px;
        cursor: pointer;
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

    .gh-portal-plan-section:first-of-type.checked::before {
        border-top-left-radius: 5px;
        border-bottom-left-radius: 5px;
    }

    .gh-portal-plan-section:last-of-type.checked::before {
        border-top-right-radius: 5px;
        border-bottom-right-radius: 5px;
    }

    .gh-portal-plan-section:last-of-type {
        border-right: none;
    }

    .gh-portal-plan-details {
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
        bottom: 5px;
        font-size: 1.4rem;
        font-weight: 500;
        letter-spacing: 0.4px;
    }

    .gh-portal-plan-price {
        font-size: 2.2rem;
        font-weight: 500;
        letter-spacing: 0.1px;
    }

    .gh-portal-plan-type {
        color: var(--grey7);
    }

    .gh-portal-plan-feature {
        font-size: 1.25rem;
        font-weight: 500;
        line-height: 1.25em;
        text-align: center;
        letter-spacing: 0.2px;
        border-top: 1px solid var(--grey12);
        width: 100%;
        margin-top: 12px;
        padding-top: 12px;
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
        top: 3px;
        width: 3px;
        height: 9px;
        border: solid var(--white);
        border-width: 0 2px 2px 0;
        -webkit-transform: rotate(45deg);
        -ms-transform: rotate(45deg);
        transform: rotate(45deg);
    }
`;

function Checkbox({name, onPlanSelect, isChecked}) {
    return (
        <div className='gh-portal-plan-checkbox'>
            <input
                name={name}
                key={name}
                type="checkbox"
                checked={isChecked}
                aria-label={name}
                onChange={e => onPlanSelect(e, name)}
            />
            <span className='checkmark'></span>
        </div>
    );
}

function PriceLabel({currency, price}) {
    return (
        <div className='gh-portal-plan-details'>
            <span className='gh-portal-plan-currency'>{currency}</span>
            <span className='gh-portal-plan-price'>{price}</span>
        </div>
    );
}

function PlanOptions({plans, selectedPlan, onPlanSelect}) {
    const hasMonthlyPlan = plans.some(({name}) => {
        return name === 'Monthly';
    });
    return plans.map(({name, currency, price, discount}, i) => {
        const isChecked = selectedPlan === name;
        const classes = (isChecked ? 'gh-portal-plan-section checked' : 'gh-portal-plan-section');
        const planDetails = {};
        switch (name) {
        case 'Free':
            planDetails.feature = 'Free preview';
            break;
        case 'Monthly':
            planDetails.feature = 'Full access';
            break;
        case 'Yearly':
            planDetails.feature = ((hasMonthlyPlan && discount > 0) ? (discount + '% discount') : 'Full access');
            break;
    
        default:
            break;
        }
        return (
            <div className={classes} key={name} onClick={e => onPlanSelect(e, name)}>
                <Checkbox name={name} isChecked={isChecked} onPlanSelect={onPlanSelect} />
                <h4 className='gh-portal-plan-name'>{name}</h4>
                <div>
                    <PriceLabel name={name} currency={currency} price={price} />
                </div>
                <div className='gh-portal-plan-feature'>
                    {planDetails.feature}
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

function PlansSection({plans, showLabel = true, selectedPlan, onPlanSelect, style}) {
    if (!plans || plans.length === 0) {
        return null;
    }
    return (
        <section>
            <PlanLabel showLabel={showLabel} />
            <div className='gh-portal-plans-container'>
                <PlanOptions plans={plans} onPlanSelect={onPlanSelect} selectedPlan={selectedPlan} />
            </div>
        </section>
    );
}

export default PlansSection;
