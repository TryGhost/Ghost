import {getNonDecimal, getSymbol, isZeroDecimalCurrency, minimumAmountForCurrency} from 'ghost-admin/utils/currency';
import {describe, it} from 'mocha';
import {expect} from 'chai';

describe('Unit: Util: currency', function () {
    describe('isZeroDecimalCurrency', function () {
        it('correctly identifies zero decimal currencies', function () {
            // JPY is a zero decimal currencies
            expect(isZeroDecimalCurrency('JPY')).to.be.true;
            expect(isZeroDecimalCurrency('jpy')).to.be.true;
            
            // Check other zero decimal currencies
            expect(isZeroDecimalCurrency('BIF')).to.be.true;
            expect(isZeroDecimalCurrency('KRW')).to.be.true;
            
            // Normal currency returns false
            expect(isZeroDecimalCurrency('USD')).to.be.false;
            expect(isZeroDecimalCurrency('EUR')).to.be.false;
            expect(isZeroDecimalCurrency('GBP')).to.be.false;
        });
        
        it('handles null or undefined input', function () {
            expect(isZeroDecimalCurrency(null)).to.be.false;
            expect(isZeroDecimalCurrency(undefined)).to.be.false;
        });
    });
    
    describe('getNonDecimal', function () {
        it('does not divide zero decimal currencies by 100', function () {
            // JPY is a zero decimal currency, so the amount is returned as is
            expect(getNonDecimal(1000, 'JPY')).to.equal(1000);
            expect(getNonDecimal(500, 'jpy')).to.equal(500);
            
            // Check other zero decimal currencies
            expect(getNonDecimal(1000, 'BIF')).to.equal(1000);
            expect(getNonDecimal(500, 'KRW')).to.equal(500);
        });
        
        it('divides normal currencies by 100', function () {
            // Normal currency is divided by 100
            // 1000 cents = 10 dollars
            expect(getNonDecimal(1000, 'USD')).to.equal(10);
            expect(getNonDecimal(500, 'EUR')).to.equal(5);
            expect(getNonDecimal(250, 'GBP')).to.equal(2.5);
        });
        
        it('handles null or undefined currency', function () {
            // Divide by 100 if currency not specified
            expect(getNonDecimal(1000)).to.equal(10);
            expect(getNonDecimal(500, null)).to.equal(5);
            expect(getNonDecimal(250, undefined)).to.equal(2.5);
        });
    });
    
    describe('minimumAmountForCurrency', function () {
        it('returns correct minimum amount for JPY', function () {
            expect(minimumAmountForCurrency('JPY')).to.equal(100);
            expect(minimumAmountForCurrency('jpy')).to.equal(100);
        });
        
        it('returns correct minimum amount for other currencies', function () {
            expect(minimumAmountForCurrency('USD')).to.equal(1);
            expect(minimumAmountForCurrency('EUR')).to.equal(1);
            expect(minimumAmountForCurrency('GBP')).to.equal(1);
            expect(minimumAmountForCurrency('AED')).to.equal(4);
            expect(minimumAmountForCurrency('HUF')).to.equal(250);
        });
        
        it('handles null or undefined input', function () {
            expect(minimumAmountForCurrency(null)).to.equal(1);
            expect(minimumAmountForCurrency(undefined)).to.equal(1);
        });
    });
    
    describe('getSymbol', function () {
        it('returns correct symbol for JPY', function () {
            expect(getSymbol('JPY')).to.equal('¥');
            expect(getSymbol('jpy')).to.equal('¥');
        });
        
        it('returns correct symbol for other currencies', function () {
            expect(getSymbol('USD')).to.equal('$');
            expect(getSymbol('EUR')).to.equal('€');
            expect(getSymbol('GBP')).to.equal('£');
        });
        
        it('handles null or undefined input', function () {
            expect(getSymbol(null)).to.equal('');
            expect(getSymbol(undefined)).to.equal('');
        });
    });
});