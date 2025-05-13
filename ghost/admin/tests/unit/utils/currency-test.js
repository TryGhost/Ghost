import {getNonDecimal, getSymbol, isZeroDecimalCurrency, minimumAmountForCurrency} from 'ghost-admin/utils/currency';
import {describe, it} from 'mocha';
import {expect} from 'chai';

describe('Unit: Util: currency', function () {
    describe('isZeroDecimalCurrency', function () {
        it('correctly identifies zero decimal currencies', function () {
            // JPYはゼロ小数点通貨
            expect(isZeroDecimalCurrency('JPY')).to.be.true;
            expect(isZeroDecimalCurrency('jpy')).to.be.true;
            
            // 他のゼロ小数点通貨も確認
            expect(isZeroDecimalCurrency('BIF')).to.be.true;
            expect(isZeroDecimalCurrency('KRW')).to.be.true;
            
            // 通常の通貨はfalseを返す
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
            // JPYはゼロ小数点通貨なので、金額をそのまま返す
            expect(getNonDecimal(1000, 'JPY')).to.equal(1000);
            expect(getNonDecimal(500, 'jpy')).to.equal(500);
            
            // 他のゼロ小数点通貨も確認
            expect(getNonDecimal(1000, 'BIF')).to.equal(1000);
            expect(getNonDecimal(500, 'KRW')).to.equal(500);
        });
        
        it('divides normal currencies by 100', function () {
            // 通常の通貨は100で割る
            expect(getNonDecimal(1000, 'USD')).to.equal(10);
            expect(getNonDecimal(500, 'EUR')).to.equal(5);
            expect(getNonDecimal(250, 'GBP')).to.equal(2.5);
        });
        
        it('handles null or undefined currency', function () {
            // 通貨が指定されていない場合は100で割る
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