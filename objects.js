let vertexShader = `
attribute vec4 a_Position;
varying vec4 v_Position;

uniform mat4 u_View;
uniform mat4 u_Projection;
uniform mat4 u_Transform;

void main(){
  v_Position = a_Position;
  gl_Position = u_Projection * u_View * u_Transform * a_Position;
}`;

var fragmentShader = `
precision mediump float;
varying vec4 v_Position;
void main(){
  gl_FragColor = abs(v_Position);
}`;


var parseOBJ = function(gl, program, data){
  var vertices = [];
  var indices = [];
  var range = [0,0];
  // parse the text into vertices and faces
  var lines = data.split('\n');
  lines.forEach(function(line){
    var tokens = line.split(" ");
    if (tokens[0] === 'v') { // vertex data
      for (var i = 1; i <= 3; i++){
        let pos = parseFloat(tokens[i]);
        range[0] = Math.min(pos, range[0]);
        range[1] = Math.max(pos, range[1]);
        vertices.push(pos);
      }
    } else if (tokens[0] === 'f') { // face data
      for (var i = 1; i <= 3; i++){
        let vertices = tokens[i];
        let attrs = vertices.split("/");
        // we just want the vertex number
        // compensate for the 1-based indexing used in .obj files
        indices.push(parseInt(attrs[0]) - 1);
      }
    }

  });
  console.log(range);

  vertices = new Float32Array(vertices);
  indices = new Uint16Array(indices);

  // load the data into the VBO
  vertexBuffer = gl.createBuffer();
  if (!vertexBuffer) {
      console.log('Failed to create the buffer object');
      return -1;
  }


  indexBuffer = gl.createBuffer();
  if (!indexBuffer) {
      console.log('Failed to create the index buffer object');
      return -1;
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);


  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

  return function(){
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      gl.vertexAttribPointer(program.a_Position, 3, gl.FLOAT, false, 0,0);
      gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
  };
};

window.onload = function(){
  let canvas = document.getElementById('canvas');
  let gl;
  // catch the error from creating the context since this has nothing to do with the code
  try{
    gl = middUtils.initializeGL(canvas);
  } catch (e){
    alert('Could not create WebGL context');
    return;
  }

  // don't catch this error since any problem here is a programmer error
  let program = middUtils.initializeProgram(gl, vertexShader, fragmentShader);


  program.a_Position = gl.getAttribLocation(program, 'a_Position');
  if (program.a_Position < 0) {
      console.log('Failed to get storage location');
      return -1;
  }
  gl.enableVertexAttribArray(program.a_Position);



  gl.enable(gl.DEPTH_TEST);


  let u_Transform = gl.getUniformLocation(program, 'u_Transform');
  let u_View = gl.getUniformLocation(program, 'u_View');
  let u_Projection = gl.getUniformLocation(program, 'u_Projection');

  let transform = mat4.create();

  gl.uniformMatrix4fv(u_Transform, false, transform);

  mat4.lookAt(transform,
    vec3.fromValues(0, 2, 5),
    vec3.fromValues(0,0,0),
    vec3.fromValues(0,1,0));

  gl.uniformMatrix4fv(u_View, false, transform);


  let projection = mat4.create();
  mat4.perspective(projection, Math.PI/3, 1, 0.5, 100);
  gl.uniformMatrix4fv(u_Projection, false, projection);



  let drawOBJ;
  let last;
  transform = mat4.create();

  let render = function(now){
    // clear the canvas
    gl.clearColor(0,0,0,1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // find the new angle based on the elapsed time
    if (now && last){
      var elapsed = now -last;
      mat4.rotateY(transform, transform, (Math.PI/4) * elapsed/1000);
    }
    last = now;

    gl.uniformMatrix4fv(u_Transform, false, transform);

    if (drawOBJ){
      drawOBJ();
    }

    requestAnimationFrame(render);
  };


  // fetch("dalek.obj")
  // .then((response)=>{
  //   return response.text();
  // })
  // .then((data)=>{
  //   drawOBJ = parseOBJ(gl, program, data);
  //   render();
  // })
  // .catch((err)=>{console.error(err);});

  $.get('dragon.obj', (data)=>{
    drawOBJ = parseOBJ(gl, program, data);
    render();
  });

};
