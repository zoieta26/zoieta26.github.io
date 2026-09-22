function tratadorDeCliqueExercicio2() {
    
    
    const data = new Date();
    let horas = data.getHours();
    const ampm = horas >= 12 ? 'PM' : 'AM';
    
    horas = horas % 12;
    horas = horas ? horas : 12; 
    
    const minutos = data.getMinutes();
    const segundos = data.getSeconds();

    alert(`Horário: ${horas} ${ampm} : ${minutos}m : ${segundos}s`);
}