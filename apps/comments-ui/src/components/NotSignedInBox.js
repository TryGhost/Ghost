function NotSignedInBox() {
    return (
        <section className="text-center mb-1 bg-neutral-50 rounded-lg pt-12 pb-10 px-8">
            <h1 className="text-center text-3xl font-sans font-bold mb-6 tracking-tight">Want to join the discussion?</h1>
            <a className="bg-black text-white font-sans py-3 px-4 mb-6 rounded inline-block" href="#/portal">Sign in to comment</a>
        </section>
    );
}
  
export default NotSignedInBox;
