class JobsRepository {
    constructor({JobModel}) {
        this._JobModel = JobModel;
    }

    async add(data) {
        const job = await this._JobModel.add(data);

        return job;
    }

    async read(name) {
        const job = await this._JobModel.findOne({name});

        return job;
    }

    async update(id, data) {
        await this._JobModel.edit(data, {id});
    }
}

module.exports = JobsRepository;
