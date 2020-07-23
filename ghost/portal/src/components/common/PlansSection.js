import React from 'react';

export const PlanSectionStyles = `
    .gh-portal-plans-container {
        border: 1px solid #ddd;
        border-radius: 5px;
    }

    .gh-portal-plan-section {
        display: flex;
        flex-direction: column;
        align-items: center;
        position: relative;
        padding: 16px;
        flex: 1;
        border-right: 1px solid #ddd;
        font-size: 1.4rem;
        line-height: 1.35em;
        cursor: pointer;
    }

    .gh-portal-plan-section.checked::before {
        position: absolute;
        display: block;
        pointer-events: none;
        content: "";
        top: -1px;
        right: -1px;
        bottom: -1px;
        left: -1px;
        border: 2px solid var(--brandcolor);
        z-index: 999;
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
        text-transform: uppercase;
        font-weight: 500;
        letter-spacing: 0.5px;
        font-size: 1.2rem;
        margin-top: 8px;
    }

    .gh-portal-plan-currency {
        position: relative;
        bottom: 5px;
        font-size: 1.4rem;
        letter-spacing: 0.4px;
        font-weight: 500;
    }

    .gh-portal-plan-price {
        font-size: 2.2rem;
        font-weight: 500;
        letter-spacing: 0.1px;
    }

    .gh-portal-plan-type {
        color: #999;
    }

    .gh-portal-plan-feature {
        margin-top: 12px;
        padding-top: 12px;
        text-align: center;
        font-size: 1.25rem;
        line-height: 1.25em;
        border-top: 1px solid #eaeaea;
        width: 100%;
        letter-spacing: 0.2px;
        font-weight: 500;
    }

    .gh-portal-plan-checkbox {
        display: block;
        position: relative;
        height: 18px;
        cursor: pointer;
        font-size: 22px;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
    }

    .gh-portal-plan-checkbox input {
        position: absolute;
        opacity: 0;
        cursor: pointer;
        height: 0;
        width: 0;
    }

    .gh-portal-plan-checkbox .checkmark {
        position: absolute;
        top: 0;
        left: -9px;
        height: 18px;
        width: 18px;
        background-color: #eee;
        border-radius: 999px;
    }

    .gh-portal-plan-checkbox input:checked ~ .checkmark {
        background-color: var(--brandcolor);
    }

    .gh-portal-plan-checkbox .checkmark::after {
        content: "";
        position: absolute;
        display: none;
    }

    .gh-portal-plan-checkbox input:checked ~ .checkmark:after {
        display: block;
    }

    .gh-portal-plan-checkbox .checkmark:after {
        left: 6.5px;
        top: 3px;
        width: 3px;
        height: 9px;
        border: solid white;
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
            planDetails.feature = (discount > 0 ? discount + '% discount' : 'Full access');
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
        <label className='gh-portal-setting-heading'>Plan</label>
    );
}

function PlansSection({plans, showLabel = true, selectedPlan, onPlanSelect, style}) {
    if (!plans || plans.length === 0) {
        return null;
    }
    return (
        <div>
            <PlanLabel showLabel={showLabel} />
            <div className='flex items-stretch gh-portal-plans-container'>
                <PlanOptions plans={plans} onPlanSelect={onPlanSelect} selectedPlan={selectedPlan} />
            </div>
        </div>
    );
}

export default PlansSection;
