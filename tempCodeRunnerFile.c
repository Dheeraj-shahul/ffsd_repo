#include<stdio.h>

int g(int n){
    return n+10;
}
int f(int n){
    return g(n*2);
}
int main()
{
    int sum=0;
    for(int n=1;n<3;n++){
        n++;
        sum+=g(f(n));

    }
    printf("%d",sum);
    
}
