import React from 'react';

export const PlanSectionStyles = `
    .gh-portal-plans-container {
        border: 1px solid #ddd;
        border-radius: 5px;
    }

    .gh-portal-plan-section {
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
        margin-top: 12px;
    }

    .gh-portal-plan-name {
        text-transform: uppercase;
        font-weight: 500;
        letter-spacing: 0.3px;
        font-size: 1.35rem;
        margin-top: 8px;
    }

    .gh-portal-plan-currency {
        font-size: 2.2rem;
    }

    .gh-portal-plan-price {
        font-size: 2.8rem;
        font-weight: 500;
    }

    .gh-portal-plan-type {
        color: #999;
    }

    .gh-portal-plan-note {
        margin-top: 10px;
        color: #999;
    }

    .gh-portal-plan-checkbox {
        width: 20px;
        height: 20px;
        margin: 0;
        padding: 0;
        cursor: pointer;
    }
`;

function Checkbox({name, onPlanSelect, isChecked}) {
    return (
        <input
            name={name}
            key={name}
            type="checkbox"
            checked={isChecked}
            className='gh-portal-plan-checkbox'
            aria-label={name}
            onChange={e => onPlanSelect(e, name)}
        />
    );
}

function PriceLabel({name, currency, price}) {
    if (name === 'Free') {
        return (
            <div className='gh-portal-plan-note'>Access free members-only posts</div>
        );
    }
    const type = name === 'Monthly' ? 'month' : 'year';
    return (
        <div className='gh-portal-plan-details'>
            <span className='gh-portal-plan-currency'>{currency}</span>
            <span className='gh-portal-plan-price'>{price}</span>
            <span className='gh-portal-plan-type'>{` / ${type}`}</span>
        </div>
    );
}

function PlanOptions({plans, selectedPlan, onPlanSelect}) {
    return plans.map(({name, currency, price}, i) => {
        const isChecked = selectedPlan === name;
        const classes = (isChecked ? 'gh-portal-plan-section checked' : 'gh-portal-plan-section');
        return (
            <div className={classes} key={name} onClick={e => onPlanSelect(e, name)}>
                <div className='gh-portal-plan-checkbox'>
                    <Checkbox name={name} isChecked={isChecked} onPlanSelect={onPlanSelect} />
                </div>
                <h4 className='gh-portal-plan-name'>{name}</h4>
                <div>
                    <PriceLabel name={name} currency={currency} price={price} />
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
