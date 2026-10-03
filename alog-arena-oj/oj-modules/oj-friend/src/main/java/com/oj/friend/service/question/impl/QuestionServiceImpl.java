package com.oj.friend.service.question.impl;

import com.oj.common.entity.TableDataInfo;
import com.oj.friend.elasticsearch.QuestionRepository;
import com.oj.friend.entity.question.QuestionInfo;
import com.oj.friend.entity.question.dto.QuestionQueryDto;
import com.oj.friend.entity.question.es.QuestionEs;
import com.oj.friend.entity.question.vo.QuestionVo;
import com.oj.friend.mapper.question.QuestionMapper;
import com.oj.friend.service.question.IQuestionService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import java.util.List;
import cn.hutool.core.bean.BeanUtil;
import cn.hutool.core.collection.CollectionUtil;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;

@Service
public class QuestionServiceImpl implements IQuestionService {

    @Autowired
    private QuestionRepository questionRepository;

    @Autowired
    private QuestionMapper questionMapper;

    @Override
    public TableDataInfo list(QuestionQueryDto questionQueryDto) {
        long count = questionRepository.count();
        if(count <= 0) {
            refreshQuestion();
        }
        Sort sort = Sort.by(Sort.Direction.DESC, "createTime");
        Pageable pageable = PageRequest.of(questionQueryDto.getPageNum() - 1,questionQueryDto.getPageSize(),sort);
        Integer difficult = questionQueryDto.getDifficult();
        String keyword = questionQueryDto.getKeyword();
        Page<QuestionEs> questionESPage;
        if(difficult == null && StrUtil.isEmpty(keyword)) {
           questionESPage = questionRepository.findAll(pageable);
        } else if (StrUtil.isEmpty(keyword)) {
            questionESPage = questionRepository.findQuestionByDifficult(difficult,pageable);
        } else if (difficult == null) {
            questionESPage = questionRepository.findByTitleOrContent(keyword,keyword,pageable);
        } else {
            questionESPage = questionRepository.findByTitleOrContentAndDifficulty(keyword,keyword,difficult,pageable);
        }
        long total = questionESPage.getTotalElements();
        if(total <= 0) {
            return TableDataInfo.empty();
        }
        List<QuestionEs> questionESList = questionESPage.getContent();
        List<QuestionVo> questionVOList = BeanUtil.copyToList(questionESList, QuestionVo.class);
        return TableDataInfo.success(questionVOList, total);
    }

    private void refreshQuestion() {
        List<QuestionInfo> questionInfoList = questionMapper.selectList(new LambdaQueryWrapper<QuestionInfo>());
        if(CollectionUtil.isEmpty(questionInfoList)) {
            return;
        }
        List<QuestionEs> questionEsList = BeanUtil.copyToList(questionInfoList, QuestionEs.class);
        questionRepository.saveAll(questionEsList);
    }
}
