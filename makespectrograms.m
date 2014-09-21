clear all
close all

% try on minimal house

path = '/Users/jaanaltosaar/projects/tsneonmusic/data/gil.wav';

[y] = wavread(path);
yav = mean(y,2); %average between 2 channels

nsamples = 0.05 * 44100; 
nloops = floor(length(y)/nsamples);

X = zeros(nloops,1025); %D = size(P(:))
p = 11;
for n = 1:nloops
    [~,~,~,P]=spectrogram(yav(nsamples*(n-1)+1:nsamples*n),2^p,2^p/2,2^p,48000,'yaxis');
    X(n,:) = P(:)';
end
%save('gil.mat','X','-append','-v7.3')

%% compute moments

%nmoments = 31;

%moments = zeros(nmoments,length(X));

%for i = 2:nmoments
    moments(i,:) = moment(X',i);
%end

%save('gil.mat','moments','-append');


%% make labels

labels = zeros(nloops,1);
%make labels
for i = 1:nloops
    labels(i) = (i-1)*0.05*44100;
end

%save('gil.mat', 'labels','-append','-v7.3')

%% run tsne

mappedX = fast_tsne(X, 50, 30, 0.5);

%save('gil.mat','mappedX','-append')
%% make scatter
load('gil.mat')
path = '/Users/jaanaltosaar/projects/tsneonmusic/data/gil.wav';
[y] = wavread(path);
yav = mean(y,2);
scatter(mappedX(:,1),mappedX(:,2),8,labels,'o');
brush on
%% allow brushing

nsamples = 0.05 * 44100; 

hB = findobj(gcf,'-property','BrushData');
brushed_locs = find(get(hB, 'BrushData'));
brushed_samples = brushed_locs*nsamples;

%sort to play em in order!
brushed_samples = sort(brushed_samples);

%play all in brushed
nBits = 16;
Fs = 44100;
ybrushed = [];
for i = 1:length(brushed_locs)
    first = brushed_samples(i);
    last = brushed_samples(i) + nsamples; % sum like this because brushed_samples(i) is int16
    ybrushed = [ybrushed; yav(first:last)];
end

sound(ybrushed,Fs,nBits);
%% make movie
close all
nBits = 16;
Fs = 44100;

nsamples = 0.05 * 44100; 
nloops = floor(length(y)/nsamples);

col = jet(5189);

for k = 2:nloops
    %scatter(mappedX(1:k,1),mappedX(1:k,2),8,labels(1:k),'o');
    scatter(mappedX(k,1),mappedX(k,2),8,col(k,:),'o');
    hold on
    %plot(mappedX(k-1:k,1),mappedX(k-1:k,2),'color',col(k,:),...
    %    'LineWidth',1.1)
    %axis equal
    M(k) = getframe;
end


