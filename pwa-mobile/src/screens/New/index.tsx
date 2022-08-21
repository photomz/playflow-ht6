import waves from '../../assets/icons/waves.svg';
import { currentUser, saveUser } from '../../api/ec2';
import { useState } from 'react';

export default () => {
    const [name, setName] = useState('');
    async function click() {
        currentUser!.playflows.push({
            name,
            coverImages: [],
            vibes: []
        });
        await saveUser();
    }
    return <>
        <div className="flex flex-col items-center" style={{paddingTop: '108px', maxHeight:'100vh',overflow:'hidden'}}>
            <span style={{fontSize: '28px', marginBottom: '28px'}}>Name your playflow</span>
            <input type="text" style={{fontSize: '24px',width:'200px', textAlign: 'center', outline: 'none', marginBottom: '20px',verticalAlign:'middle'}} placeholder="Playflow Title" onChange={e => setName(e.target.value)} value={name} />
            <button className="bg-blue-600 font-bold" style={{width:'127px',height:'45px',fontSize:'20px',borderRadius:'25px',color:'white'}} onClick={click}>Create</button>
            <img src={waves} style={{'marginTop':'30px'}} />
        </div>
    </>;
};
