const ListIndex = () => {
    return (
        <div className='mx-auto my-0 w-full max-w-3xl p-12'>
            <h1 className='mb-6 text-black'>ActivityPub Demo</h1>
            <div className='flex flex-col'>
                <div className='mb-4 flex flex-col'>
                    <h2 className='mb-2 text-2xl text-black'>This is a post title</h2>
                    <p className='mb-2 text-lg text-grey-950'>This is some very short post content</p>
                    <p className='text-md text-grey-700'>Publish McPublisher</p>
                </div>
                <div className='mb-4 flex flex-col'>
                    <h2 className='mb-2 text-2xl text-black'>This is a post title</h2>
                    <p className='mb-2 text-lg text-grey-950'>This is some very short post content</p>
                    <p className='text-md text-grey-700'>Publish McPublisher</p>
                </div>
                <div className='mb-4 flex flex-col'>
                    <h2 className='mb-2 text-2xl text-black'>This is a post title</h2>
                    <p className='mb-2 text-lg text-grey-950'>This is some very short post content</p>
                    <p className='text-md text-grey-700'>Publish McPublisher</p>
                </div>
            </div>
        </div>
    );
};

export default ListIndex;
