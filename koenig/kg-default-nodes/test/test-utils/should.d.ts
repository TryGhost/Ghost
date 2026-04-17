import 'should';

declare module 'should' {
    interface Assertion {
        prettifyTo(expected: string): this;
    }
}

declare namespace should {
    interface Assertion {
        prettifyTo(expected: string): this;
    }
}
