export abstract class BaseEvent<Data> {
    constructor(
        public readonly data: Data,
        public readonly timestamp: Date = new Date()
    ) {}
}
