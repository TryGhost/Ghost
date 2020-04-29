import React from 'react';

function Checkbox({name, onPlanSelect, isChecked}) {
    const style = {
        width: '20px',
        height: '20px',
        border: 'solid 1px #cccccc'
    };

    return (
        <input
            name={name}
            key={name}
            type="checkbox"
            checked={isChecked}
            aria-label={name}
            style={style}
            onChange={e => onPlanSelect(e, name)}
        />
    );
}

function PriceLabel({name, currency, price}) {
    if (name === 'Free') {
        return (
            <strong style={{
                fontSize: '11px',
                textAlign: 'center',
                lineHeight: '18px',
                color: '#929292',
                fontWeight: 'normal'
            }}> Access free members-only posts </strong>
        );
    }
    const type = name === 'Monthly' ? 'month' : 'year';
    return (
        <div style={{
            display: 'inline',
            verticalAlign: 'baseline'
        }}>
            <span style={{fontSize: '14px', color: '#929292', fontWeight: 'normal'}}> {currency} </span>
            <strong style={{fontSize: '21px'}}> {price} </strong>
            <span style={{fontSize: '12px', color: '#929292', fontWeight: 'normal'}}> {` / ${type}`}</span>
        </div>
    );
}

function PlanOptions({plans, selectedPlan, onPlanSelect}) {
    const nameStyle = {
        fontSize: '13px',
        fontWeight: '500',
        display: 'flex',
        color: '#343F44',
        justifyContent: 'center'
    };

    const priceStyle = {
        fontSize: '12px',
        fontWeight: 'bold',
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '9px'
    };
    const checkboxStyle = {
        display: 'flex',
        justifyContent: 'center'
    };
    const boxStyle = ({isLast = false}) => {
        const style = {
            padding: '12px 12px',
            flexBasis: '100%'
        };
        if (!isLast) {
            style.borderRight = '1px solid #c5d2d9';
        }
        return style;
    };

    return plans.map(({name, currency, price}, i) => {
        const isLast = i === plans.length - 1;
        const isChecked = selectedPlan === name;
        return (
            <div style={boxStyle({isLast})} key={name} onClick={e => onPlanSelect(e, name)}>
                <div style={checkboxStyle}>
                    <Checkbox name={name} isChecked={isChecked} onPlanSelect={onPlanSelect} />
                </div>
                <div style={nameStyle}> {name.toUpperCase()} </div>
                <div style={priceStyle}>
                    <PriceLabel name={name} currency={currency} price={price} />
                </div>
            </div>
        );
    });
}

function PlansSection({plans, selectedPlan, onPlanSelect, style}) {
    const containerStyle = {
        display: 'flex',
        border: '1px solid #c5d2d9',
        borderRadius: '9px',
        marginBottom: '12px'
    };

    if (!plans || plans.length === 0) {
        return null;
    }
    return (
        <div style={{width: '100%'}}>
            <label style={{marginBottom: '3px', fontSize: '12px', fontWeight: '700'}}>  Plan </label>
            <div style={containerStyle}>
                <PlanOptions plans={[
                    {type: 'free', price: 'Decide later', name: 'Free'},
                    {type: 'month', price: plans.monthly, currency: plans.currency_symbol, name: 'Monthly'},
                    {type: 'year', price: plans.yearly, currency: plans.currency_symbol, name: 'Yearly'}
                ]} onPlanSelect={onPlanSelect} selectedPlan={selectedPlan} />
            </div>
        </div>
    );
}

export default PlansSection;
